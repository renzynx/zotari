// This worker handles downloading multiple chunks in parallel and merging them

interface DownloadRequest {
  type: "download";
  fileId: string;
  chunks: {
    chunkIndex: number;
    url: string;
    size: number;
  }[];
  fileName: string;
  fileType: string;
}

interface DownloadProgress {
  type: "progress";
  fileId: string;
  fileName: string;
  totalBytes: number;
  downloadedBytes: number;
  overallProgress: number; // 0-100
  currentChunk: number;
  totalChunks: number;
  speed: number; // bytes per second
  estimatedTimeLeft: number; // in milliseconds
}

interface DownloadComplete {
  type: "complete";
  fileId: string;
  fileName: string;
  fileSize: number;
  blob: Blob;
}

interface DownloadError {
  type: "error";
  fileId: string;
  message: string;
  chunkIndex?: number;
}

interface CancelRequest {
  type: "cancel";
}

const MAX_CONCURRENT_DOWNLOADS = 3;
const PROGRESS_INTERVAL = 100; // ms

// Download state tracking
let isDownloading = false;
let downloadStartTime = 0;
let downloadedBytes = 0;
let totalBytes = 0;
let activeDownloads = 0;
let cancelRequested = false;
let lastProgressUpdateTime = 0;
let downloadedChunks: (ArrayBuffer | null)[] = [];
let currentFileId = "";
let currentFileName = "";

// @ts-ignore
function debug(...args: any[]) {
  console.log(`[File Downloader ${Date.now()}]`, ...args);
}

// Handle incoming messages
self.addEventListener(
  "message",
  async (event: MessageEvent<DownloadRequest | CancelRequest>) => {
    const data = event.data;

    if (data.type === "cancel") {
      cancelRequested = true;
      debug("Download cancelled");
      return;
    }

    if (data.type === "download") {
      if (isDownloading) {
        self.postMessage({
          type: "error",
          fileId: data.fileId,
          message: "Another download is already in progress",
        } as DownloadError);
        return;
      }

      // Reset state
      isDownloading = true;
      downloadStartTime = Date.now();
      downloadedBytes = 0;
      totalBytes = data.chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      activeDownloads = 0;
      cancelRequested = false;
      lastProgressUpdate = 0;
      downloadedChunks = new Array(data.chunks.length).fill(null);
      currentFileId = data.fileId;
      currentFileName = data.fileName;

      debug(
        `Starting download of ${data.fileName} (${data.chunks.length} chunks)`
      );

      try {
        // Download chunks in parallel with limited concurrency
        const chunkPromises = await processChunksWithConcurrency(
          data.chunks,
          MAX_CONCURRENT_DOWNLOADS
        );

        if (cancelRequested) {
          throw new Error("Download cancelled by user");
        }

        // All chunks downloaded, merge them
        if (downloadedChunks.some((c) => c === null)) {
          throw new Error("Some chunks failed to download");
        }

        debug("All chunks downloaded, merging...");
        const mergedFile = mergeChunks(
          downloadedChunks as ArrayBuffer[],
          data.fileType
        );

        // Send completion message
        self.postMessage({
          type: "complete",
          fileId: data.fileId,
          fileName: data.fileName,
          fileSize: mergedFile.size,
          blob: mergedFile,
        } as DownloadComplete);

        debug(`Download complete: ${data.fileName}`);
      } catch (error) {
        if (!cancelRequested) {
          self.postMessage({
            type: "error",
            fileId: data.fileId,
            message: error instanceof Error ? error.message : "Download failed",
          } as DownloadError);

          debug(`Download error: ${error}`);
        }
      } finally {
        isDownloading = false;
      }
    }
  }
);

// Process chunks with limited concurrency
async function processChunksWithConcurrency(
  chunks: DownloadRequest["chunks"],
  concurrency: number
): Promise<void> {
  let currentIndex = 0;
  const total = chunks.length;

  // Create a function to process the next chunk
  const processNext = async () => {
    if (cancelRequested) return;

    const index = currentIndex++;
    if (index >= total) return;

    activeDownloads++;
    try {
      const chunk = chunks[index];
      await downloadChunk(chunk.url, index, chunk.size);
    } finally {
      activeDownloads--;
      // Process next chunk if available
      await processNext();
    }
  };

  // Start initial batch of downloads
  const initialBatch = [];
  for (let i = 0; i < concurrency; i++) {
    initialBatch.push(processNext());
  }

  // Wait for all downloads to complete
  await Promise.all(initialBatch);
}

// Update the downloadChunk function to use the download API
async function downloadChunk(
  url: string,
  chunkIndex: number,
  chunkSize: number
): Promise<void> {
  if (cancelRequested) return;

  debug(`Downloading chunk ${chunkIndex + 1}`);

  try {
    // Always use the download endpoint
    const origin = self.location?.origin || "http://localhost:3000";

    // Notice we're using /api/download here, not /api/proxy
    const downloadUrl = `${origin}/api/download?url=${encodeURIComponent(url)}`;

    debug(`Fetching from download endpoint: ${downloadUrl}`);

    const response = await fetch(downloadUrl);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }

    // Stream the response to track progress
    const reader = response.body!.getReader();
    const contentLength = chunkSize;
    let receivedLength = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      if (cancelRequested) {
        reader.cancel();
        return;
      }

      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      chunks.push(value);
      receivedLength += value.length;

      // Update progress
      downloadedBytes += value.length;
      sendDownloadProgressUpdate();
    }

    // Combine all chunks into a single Uint8Array
    const chunksAll = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      chunksAll.set(chunk, position);
      position += chunk.length;
    }

    // Save the downloaded chunk
    downloadedChunks[chunkIndex] = chunksAll.buffer;

    debug(`Chunk ${chunkIndex + 1} downloaded successfully`);
  } catch (error) {
    if (!cancelRequested) {
      debug(`Error downloading chunk ${chunkIndex + 1}: ${error}`);
      self.postMessage({
        type: "error",
        fileId: currentFileId,
        message: `Error downloading chunk ${chunkIndex + 1}: ${error}`,
        chunkIndex,
      } as DownloadError);
    }
    throw error;
  }
}

// Send progress updates at controlled intervals
function sendDownloadProgressUpdate(): void {
  const now = Date.now();
  if (now - lastProgressUpdateTime < PROGRESS_INTERVAL) return;

  lastProgressUpdateTime = now;
  const timeElapsed = now - downloadStartTime;

  // Calculate download speed and estimated time
  const speed = timeElapsed > 0 ? (downloadedBytes / timeElapsed) * 1000 : 0;
  const estimatedTimeLeft =
    speed > 0 ? ((totalBytes - downloadedBytes) / speed) * 1000 : 0;

  const completedChunks = downloadedChunks.filter((c) => c !== null).length;

  self.postMessage({
    type: "progress",
    fileId: currentFileId,
    fileName: currentFileName,
    totalBytes,
    downloadedBytes,
    overallProgress: Math.min(
      100,
      Math.round((downloadedBytes / totalBytes) * 100)
    ),
    currentChunk: completedChunks,
    totalChunks: downloadedChunks.length,
    speed,
    estimatedTimeLeft,
  } as DownloadProgress);
}

// Merge downloaded chunks into a single file blob
function mergeChunks(chunks: ArrayBuffer[], fileType: string): Blob {
  // Combine all chunks into a single blob
  return new Blob(chunks, { type: fileType });
}
