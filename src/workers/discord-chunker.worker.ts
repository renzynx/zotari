/// <reference lib="webworker" />

// Types for worker messages
interface WorkerRequest {
  type: "upload" | "cancel";
  file?: File;
  webhookUrls?: string[];
  chunkSize?: number;
  dbFileId?: string; // Add dbFileId to WorkerRequest interface
}

interface ProgressUpdate {
  type: "progress";
  fileId: string;
  fileName: string;
  totalBytes: number;
  uploadedBytes: number;
  overallProgress: number;
  chunks: ChunkStatus[];
  estimatedTimeRemaining?: number;
  uploadSpeed?: number;
}

interface ChunkStatus {
  id: number;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  webhookUrl?: string;
  error?: string;
  size: number;
  uploadedBytes: number;
}

interface UploadComplete {
  type: "complete";
  fileId: string;
  fileName: string;
  totalSize: number;
  totalChunks: number;
  successfulChunks: number;
  failedChunks: number;
  totalTime: number;
  averageSpeed: number;
}

interface ErrorMessage {
  type: "error";
  fileId: string;
  message: string;
}

// New message for creating a file record
interface CreateFileRequest {
  type: "create-file";
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  totalChunks: number;
}

// New message for saving a chunk URL
interface SaveChunkRequest {
  type: "save-chunk";
  fileId: string;
  chunkIndex: number;
  discordUrl: string;
  size: number;
  discordFileId?: string;
  messageId?: string;
  webhookId?: string;
}

// Rate limit information
interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  bucket: string;
}

// Constants
const DISCORD_CHUNK_SIZE = 9 * 1024 * 1024; // 9MB
const PROGRESS_UPDATE_INTERVAL = 100; // ms between progress updates
const DEBUG = true; // Enable debug logs

// @ts-ignore
function debug(...args: any[]) {
  console.log(`[File Downloader ${Date.now()}]`, ...args);
}

// Track rate limits per webhook
const rateLimitMap = new Map<string, RateLimitInfo>();

// Current upload state
let isUploading = false;
let lastProgressUpdate = 0;
let uploadCanceledFlag = false;

// Completion tracking
let completedChunksCount = 0;
let totalChunksCount = 0;
let uploadCompleteSent = false;
let uploadStartTime = 0;
let fileData: { id: string; name: string; size: number } | null = null;

// NEW: Track which chunks have been processed to prevent duplicates
const processedChunks = new Set<number>();
// NEW: Track which webhook is currently processing which chunk
const activeChunks = new Map<string, Set<number>>();

// Add this with your other global variables at the top level
let databaseFileId: string | undefined;

// Add global variable to store dbFileId
let dbFileId: string | undefined;

self.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
  const { type, dbFileId: requestDbFileId } = event.data;

  // Store the database file ID at the global level
  databaseFileId = requestDbFileId;

  debug(
    "Worker received message:",
    type,
    requestDbFileId ? `(dbFileId: ${requestDbFileId})` : ""
  );

  if (type === "upload") {
    const { file, webhookUrls, chunkSize = DISCORD_CHUNK_SIZE } = event.data;

    // Store the file ID for later use
    dbFileId = requestDbFileId;
    debug(`Worker received message: ${type}, dbFileId: ${dbFileId || "none"}`);

    if (!file || !webhookUrls || webhookUrls.length === 0) {
      debug("Missing file or webhook URLs");
      self.postMessage({
        type: "error",
        fileId: "unknown",
        message: "Missing file or webhook URLs",
      } as ErrorMessage);
      return;
    }

    debug("Starting upload", {
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
      },
      webhookCount: webhookUrls.length,
      chunkSize,
    });

    try {
      // Reset state
      isUploading = true;
      uploadCanceledFlag = false;
      completedChunksCount = 0;
      uploadCompleteSent = false;
      uploadStartTime = Date.now();
      fileData = {
        id: `${file.name}-${Date.now()}`,
        name: file.name,
        size: file.size,
      };
      processedChunks.clear();

      // Initialize active chunks for each webhook
      webhookUrls.forEach((url, index) => {
        activeChunks.set(url, new Set());
        debug(`Initialized webhook ${index}: ${url.substring(0, 20)}...`);
      });

      await uploadFile(file, webhookUrls, chunkSize);
    } catch (error) {
      debug("Upload error:", error);
      if (!uploadCanceledFlag) {
        self.postMessage({
          type: "error",
          fileId: file.name,
          message: error instanceof Error ? error.message : "Upload failed",
        } as ErrorMessage);
      }
    } finally {
      debug("Upload process finished");
    }
  } else if (type === "cancel") {
    debug("Upload canceled");
    uploadCanceledFlag = true;
    isUploading = false;
  }
});

/**
 * Upload a file using multiple webhooks
 */
async function uploadFile(
  file: File,
  webhookUrls: string[],
  chunkSize: number
): Promise<void> {
  const fileId = fileData!.id;

  // Calculate chunks
  const totalChunks = Math.ceil(file.size / chunkSize);
  totalChunksCount = totalChunks; // Store for global access

  debug(`File will be split into ${totalChunks} chunks of ${chunkSize} bytes`);

  // Create chunk details
  const chunks: ChunkStatus[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const size = end - start;

    chunks.push({
      id: i,
      status: "pending",
      progress: 0,
      size,
      uploadedBytes: 0,
    });
  }

  // Send initial progress update
  sendProgressUpdate(fileId, file.name, file.size, 0, chunks);

  // NEW: Dedicated chunk assignment with logging
  debug("Starting chunk assignment to webhooks");

  // CRITICAL FIX: Use a NEW approach for assigning chunks to webhooks
  // Each webhook will get a dedicated array of chunks that ONLY it will process
  // This is the key to preventing duplicates

  // Create a fixed assignment of chunks to webhooks
  const chunkAssignments = new Map<string, number[]>();

  // Initialize empty arrays for each webhook
  webhookUrls.forEach((url) => {
    chunkAssignments.set(url, []);
  });

  // Assign each chunk to exactly one webhook in a round-robin fashion
  for (let i = 0; i < totalChunks; i++) {
    const webhookUrl = webhookUrls[i % webhookUrls.length];
    const existingChunks = chunkAssignments.get(webhookUrl) || [];
    existingChunks.push(i);
    chunkAssignments.set(webhookUrl, existingChunks);

    // Mark in the chunk status which webhook will handle this chunk
    chunks[i].webhookUrl = webhookUrl;

    debug(`Assigned chunk ${i} to webhook ${webhookUrls.indexOf(webhookUrl)}`);
  }

  // Log the assignments for debugging
  chunkAssignments.forEach((chunkIds, webhookUrl) => {
    debug(
      `Webhook ${webhookUrls.indexOf(
        webhookUrl
      )} will process chunks: ${chunkIds.join(", ")}`
    );
  });

  // Create promises for each webhook to process its assigned chunks
  const webhookPromises: Promise<void>[] = [];

  chunkAssignments.forEach((chunkIds, webhookUrl) => {
    const promise = uploadChunksForWebhook(
      webhookUrl,
      chunkIds,
      file,
      fileId,
      chunkSize,
      chunks
    );
    webhookPromises.push(promise);
  });

  debug(`${webhookPromises.length} webhook upload tasks created`);

  // Wait for all webhooks to finish their assigned chunks
  await Promise.all(webhookPromises);

  debug("All webhook promises resolved");

  // Double-check completion
  checkAndSendCompletion();
}

/**
 * Upload all chunks assigned to a specific webhook
 */
async function uploadChunksForWebhook(
  webhookUrl: string,
  chunkIds: number[],
  file: File,
  fileId: string,
  chunkSize: number,
  chunks: ChunkStatus[]
): Promise<void> {
  const webhookIndex = Array.from(activeChunks.keys()).indexOf(webhookUrl);
  debug(
    `Webhook ${webhookIndex} starting to process ${chunkIds.length} assigned chunks`
  );

  // Process chunks sequentially for this webhook
  for (const chunkId of chunkIds) {
    if (uploadCanceledFlag) {
      debug(`Webhook ${webhookIndex} stopping due to cancel flag`);
      break;
    }

    // Skip if this chunk has somehow already been processed
    if (processedChunks.has(chunkId)) {
      debug(
        `WARNING: Webhook ${webhookIndex} skipping chunk ${chunkId} - already processed!`
      );
      continue;
    }

    // Mark this chunk as being processed to prevent duplicates
    processedChunks.add(chunkId);

    debug(`Webhook ${webhookIndex} starting chunk ${chunkId}`);

    try {
      // Mark as uploading
      chunks[chunkId].status = "uploading";
      chunks[chunkId].webhookUrl = webhookUrl;

      // Get the current active set for this webhook
      const activeSet = activeChunks.get(webhookUrl) || new Set<number>();
      // Add this chunk to the active set
      activeSet.add(chunkId);
      activeChunks.set(webhookUrl, activeSet);

      sendProgressUpdate(
        fileId,
        file.name,
        file.size,
        calculateProgress(chunks),
        chunks
      );

      // Calculate chunk bytes
      const start = chunkId * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      // Generate unique ID for this chunk
      const uniqueId = `${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .substring(2, 3)}`;

      debug(
        `Webhook ${webhookIndex} uploading chunk ${chunkId} with ID ${uniqueId}`
      );

      // Upload the chunk
      await uploadSingleChunk(
        chunk,
        webhookUrl,
        webhookIndex,
        file.name,
        chunkId,
        chunks.length,
        uniqueId,
        (progress) => {
          if (uploadCanceledFlag) return;

          // Update chunk progress
          chunks[chunkId].progress = progress;
          chunks[chunkId].uploadedBytes = Math.floor(
            (progress / 100) * chunks[chunkId].size
          );

          // Only send throttled updates
          const now = Date.now();
          if (now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL) {
            lastProgressUpdate = now;
            sendProgressUpdate(
              fileId,
              file.name,
              file.size,
              calculateProgress(chunks),
              chunks
            );
          }
        }
      );

      // Remove this chunk from the active set
      activeSet.delete(chunkId);
      activeChunks.set(webhookUrl, activeSet);

      // Mark as success
      chunks[chunkId].status = "success";
      chunks[chunkId].progress = 100;
      chunks[chunkId].uploadedBytes = chunks[chunkId].size;

      debug(`Webhook ${webhookIndex} completed chunk ${chunkId} successfully`);
    } catch (error) {
      // Mark as error
      chunks[chunkId].status = "error";
      chunks[chunkId].error =
        error instanceof Error ? error.message : String(error);

      debug(
        `Webhook ${webhookIndex} error on chunk ${chunkId}: ${chunks[chunkId].error}`
      );

      // Remove from active set on error too
      const activeSet = activeChunks.get(webhookUrl);
      if (activeSet) {
        activeSet.delete(chunkId);
        activeChunks.set(webhookUrl, activeSet);
      }
    }

    // Mark this chunk as completed regardless of success/failure
    completedChunksCount++;
    debug(
      `Webhook ${webhookIndex} marked chunk ${chunkId} as completed. Total: ${completedChunksCount}/${totalChunksCount}`
    );

    // Check if we've completed all chunks
    checkAndSendCompletion();

    // Send a progress update after each chunk
    sendProgressUpdate(
      fileId,
      file.name,
      file.size,
      calculateProgress(chunks),
      chunks
    );
  }

  debug(`Webhook ${webhookIndex} finished processing all assigned chunks`);
}

/**
 * Check if all chunks are complete and send completion message if needed
 */
function checkAndSendCompletion(): void {
  if (uploadCompleteSent || uploadCanceledFlag) return;

  debug(
    `Checking completion: ${completedChunksCount}/${totalChunksCount} chunks completed`
  );

  if (completedChunksCount >= totalChunksCount) {
    debug(
      `All ${totalChunksCount} chunks completed, sending completion message`
    );

    uploadCompleteSent = true;

    // Send completion message
    if (fileData) {
      const { id, name, size } = fileData;
      const totalTime = Date.now() - uploadStartTime;

      // Check for any active uploads still in progress
      let stillActive = false;
      activeChunks.forEach((chunkSet, webhook) => {
        if (chunkSet.size > 0) {
          stillActive = true;
          debug(
            `WARNING: Webhook has ${chunkSet.size} chunks still active while sending completion`
          );
        }
      });

      if (stillActive) {
        debug("WARNING: Completing upload while some chunks are still active!");
      }

      // If we have a database file ID, send a message to mark it as complete
      if (databaseFileId) {
        self.postMessage({
          type: "file-complete",
          fileId: databaseFileId,
        });
        debug(`Sent completion for database file ${databaseFileId}`);
      }

      // If we have a dbFileId, send a message to mark it as complete
      if (dbFileId) {
        debug(`Sending file-complete message for database file ${dbFileId}`);
        self.postMessage({
          type: "file-complete",
          fileId: dbFileId,
        });
      }

      self.postMessage({
        type: "complete",
        fileId: id,
        fileName: name,
        totalSize: size,
        totalChunks: totalChunksCount,
        successfulChunks: totalChunksCount,
        failedChunks: 0,
        totalTime,
        averageSpeed: size / (totalTime / 1000),
      } as UploadComplete);

      debug("Upload complete message sent");
    }
  }
}

/**
 * Upload a single chunk to Discord
 */
async function uploadSingleChunk(
  chunk: Blob,
  webhookUrl: string,
  webhookIndex: number,
  fileName: string,
  chunkId: number,
  totalChunks: number,
  uniqueId: string,
  onProgress: (progress: number) => void
): Promise<void> {
  const MAX_RETRIES = 3;
  let retries = 0;

  // Create unique filename for this chunk
  const fileExtension = fileName.includes(".") ? fileName.split(".").pop() : "";
  const chunkFileName = fileExtension
    ? `${fileName.replace(`.${fileExtension}`, "")}_part${
        chunkId + 1
      }of${totalChunks}_${uniqueId}.${fileExtension}`
    : `${fileName}_part${chunkId + 1}of${totalChunks}_${uniqueId}`;

  debug(
    `Webhook ${webhookIndex} preparing to upload chunk ${chunkId} file: ${chunkFileName}`
  );

  while (retries <= MAX_RETRIES && !uploadCanceledFlag) {
    try {
      // Wait for rate limit
      debug(`Webhook ${webhookIndex} checking rate limit for chunk ${chunkId}`);
      await waitForRateLimit(webhookUrl);

      debug(`Webhook ${webhookIndex} starting XHR upload for chunk ${chunkId}`);

      // Upload the chunk
      await new Promise<void>((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", chunk, chunkFileName);
        formData.append(
          "content",
          `Chunk ${
            chunkId + 1
          }/${totalChunks} of "${fileName}" (ID:${uniqueId})`
        );

        const xhr = new XMLHttpRequest();

        // Track progress
        xhr.upload.addEventListener("progress", (event) => {
          if (uploadCanceledFlag) {
            xhr.abort();
            reject(new Error("Upload cancelled"));
            return;
          }

          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });

        // Handle completion
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            updateRateLimitInfo(webhookUrl, xhr);
            onProgress(100);

            // Extract attachment URL from Discord response
            try {
              const response = JSON.parse(xhr.responseText);
              if (
                response &&
                response.attachments &&
                response.attachments.length > 0
              ) {
                const attachment = response.attachments[0];

                // Send chunk URL info back to main thread
                // Only if we have a valid database file ID
                if (databaseFileId) {
                  self.postMessage({
                    type: "chunk-url",
                    fileId: databaseFileId,
                    chunkIndex: chunkId,
                    discordUrl: attachment.url,
                    size: chunk.size,
                    discordFileId: attachment.id,
                    messageId: response.id,
                    webhookUrl: webhookUrl,
                  });
                  debug(
                    `Sent chunk URL info for database file ${databaseFileId}, chunk ${chunkId}`
                  );
                } else {
                  debug(
                    `No database file ID available, skipping chunk URL storage`
                  );
                }

                // Send chunk URL info back to main thread if we have a database file ID
                if (dbFileId) {
                  debug(
                    `Sending chunk URL for fileId ${dbFileId}, chunk ${chunkId}`
                  );
                  self.postMessage({
                    type: "chunk-url",
                    fileId: dbFileId,
                    chunkIndex: chunkId,
                    discordUrl: attachment.url,
                    size: chunk.size,
                    discordFileId: attachment.id,
                    messageId: response.id,
                    webhookUrl: webhookUrl,
                  });
                }
              }
            } catch (e) {
              debug(`Error parsing Discord response: ${e}`);
            }

            resolve();
          } else {
            reject(new Error(`HTTP error ${xhr.status}: ${xhr.statusText}`));
          }
        });

        // Handle errors
        xhr.addEventListener("error", () => {
          debug(`Webhook ${webhookIndex} chunk ${chunkId} network error`);
          reject(new Error("Network error"));
        });
        xhr.addEventListener("abort", () => {
          debug(`Webhook ${webhookIndex} chunk ${chunkId} upload aborted`);
          reject(new Error("Upload aborted"));
        });

        // Send request
        xhr.open("POST", webhookUrl);
        xhr.send(formData);
      });

      // Success!
      debug(
        `Webhook ${webhookIndex} chunk ${chunkId} upload completed successfully`
      );
      return;
    } catch (error) {
      retries++;
      debug(
        `Webhook ${webhookIndex} chunk ${chunkId} failed (attempt ${retries}/${MAX_RETRIES}): ${error}`
      );

      if (uploadCanceledFlag || retries > MAX_RETRIES) {
        debug(
          `Webhook ${webhookIndex} chunk ${chunkId} giving up after ${retries} attempts`
        );
        throw error;
      }

      // Backoff before retry
      const backoffTime = Math.min(1000 * 2 ** retries, 10000);
      debug(
        `Webhook ${webhookIndex} chunk ${chunkId} backing off for ${backoffTime}ms before retry`
      );
      await new Promise((resolve) => setTimeout(resolve, backoffTime));
    }
  }

  throw new Error("Upload failed after retries");
}

// Rest of the utility functions remain the same...
/**
 * Calculate overall progress percentage
 */
function calculateProgress(chunks: ChunkStatus[]): number {
  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
  const uploadedBytes = chunks.reduce(
    (sum, chunk) => sum + chunk.uploadedBytes,
    0
  );
  return totalSize > 0 ? Math.min(100, (uploadedBytes / totalSize) * 100) : 0;
}

/**
 * Calculate upload speed in bytes per second
 */
function calculateSpeed(chunks: ChunkStatus[]): number {
  const uploadedBytes = chunks.reduce(
    (sum, chunk) => sum + chunk.uploadedBytes,
    0
  );
  const elapsedSeconds = (Date.now() - uploadStartTime) / 1000;
  return elapsedSeconds > 0 ? uploadedBytes / elapsedSeconds : 0;
}

/**
 * Calculate estimated time remaining in seconds
 */
function calculateTimeRemaining(chunks: ChunkStatus[]): number | undefined {
  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
  const uploadedBytes = chunks.reduce(
    (sum, chunk) => sum + chunk.uploadedBytes,
    0
  );
  const remainingBytes = totalSize - uploadedBytes;

  const elapsedSeconds = (Date.now() - uploadStartTime) / 1000;
  const speed = elapsedSeconds > 0 ? uploadedBytes / elapsedSeconds : 0;

  return speed > 0 ? remainingBytes / speed : undefined;
}

/**
 * Send progress update to main thread
 */
function sendProgressUpdate(
  fileId: string,
  fileName: string,
  totalBytes: number,
  overallProgress: number,
  chunks: ChunkStatus[]
): void {
  if (uploadCanceledFlag) return;

  const uploadedBytes = chunks.reduce(
    (sum, chunk) => sum + chunk.uploadedBytes,
    0
  );

  self.postMessage({
    type: "progress",
    fileId,
    fileName,
    totalBytes,
    uploadedBytes,
    overallProgress,
    chunks,
    estimatedTimeRemaining: calculateTimeRemaining(chunks),
    uploadSpeed: calculateSpeed(chunks),
  } as ProgressUpdate);
}

/**
 * Check and wait for rate limit if needed
 */
async function waitForRateLimit(webhookUrl: string): Promise<void> {
  const rateLimitInfo = rateLimitMap.get(webhookUrl);

  if (!rateLimitInfo) {
    rateLimitMap.set(webhookUrl, {
      remaining: 5,
      resetTime: 0,
      bucket: "",
    });
    return;
  }

  const now = Date.now() / 1000; // Current time in seconds

  // If we've hit the rate limit, wait until reset time
  if (rateLimitInfo.remaining <= 0 && rateLimitInfo.resetTime > now) {
    const waitTime = (rateLimitInfo.resetTime - now) * 1000;
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(100, waitTime))
    );
  }
}

/**
 * Update rate limit information from response headers
 */
function updateRateLimitInfo(webhookUrl: string, xhr: XMLHttpRequest): void {
  const rateLimitInfo = rateLimitMap.get(webhookUrl) || {
    remaining: 5,
    resetTime: 0,
    bucket: "",
  };

  // Extract rate limit headers
  const remaining = xhr.getResponseHeader("X-RateLimit-Remaining");
  const reset = xhr.getResponseHeader("X-RateLimit-Reset");
  const bucket = xhr.getResponseHeader("X-RateLimit-Bucket");

  if (remaining) rateLimitInfo.remaining = parseInt(remaining, 10);
  if (reset) rateLimitInfo.resetTime = parseFloat(reset);
  if (bucket) rateLimitInfo.bucket = bucket;

  rateLimitMap.set(webhookUrl, rateLimitInfo);
}
