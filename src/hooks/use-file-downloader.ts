import { useState, useEffect, useRef, useCallback } from "react";

interface DownloadProgress {
  totalBytes: number;
  downloadedBytes: number;
  overallProgress: number; // 0-100
  currentChunk: number;
  totalChunks: number;
  speed: number; // bytes per second
  estimatedTimeLeft: number; // in milliseconds
}

interface DownloadResult {
  fileName: string;
  fileSize: number;
  blob: Blob;
}

interface UseFileDownloaderOptions {
  onProgress?: (progress: DownloadProgress) => void;
  onComplete?: (result: DownloadResult) => void;
  onError?: (fileId: string, message: string) => void;
}

export function useFileDownloader(options: UseFileDownloaderOptions = {}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to store the worker instance
  const workerRef = useRef<Worker | null>(null);

  // Store a unique ID to help debug
  const instanceId = useRef(
    `instance-${Math.random().toString(36).substring(2, 9)}`
  );

  // Track options in a ref to avoid stale closures
  const optionsRef = useRef(options);

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Create the worker only once
  const getWorker = useCallback(() => {
    console.log(`[useFileDownloader ${instanceId.current}] Getting worker`);

    if (!workerRef.current) {
      console.log(
        `[useFileDownloader ${instanceId.current}] Creating new worker`
      );
      workerRef.current = new Worker(
        new URL("../workers/file-downloader.worker.ts", import.meta.url)
      );

      workerRef.current.onmessage = (event) => {
        const data = event.data;
        switch (data.type) {
          case "progress":
            setProgress({
              totalBytes: data.totalBytes,
              downloadedBytes: data.downloadedBytes,
              overallProgress: data.overallProgress,
              currentChunk: data.currentChunk,
              totalChunks: data.totalChunks,
              speed: data.speed,
              estimatedTimeLeft: data.estimatedTimeLeft,
            });
            optionsRef.current.onProgress?.({
              totalBytes: data.totalBytes,
              downloadedBytes: data.downloadedBytes,
              overallProgress: data.overallProgress,
              currentChunk: data.currentChunk,
              totalChunks: data.totalChunks,
              speed: data.speed,
              estimatedTimeLeft: data.estimatedTimeLeft,
            });
            break;
          case "complete":
            setResult({
              fileName: data.fileName,
              fileSize: data.fileSize,
              blob: data.blob,
            });
            setIsDownloading(false);
            optionsRef.current.onComplete?.({
              fileName: data.fileName,
              fileSize: data.fileSize,
              blob: data.blob,
            });
            break;
          case "error":
            setError(data.message);
            setIsDownloading(false);
            optionsRef.current.onError?.(data.fileId, data.message);
            break;
        }
      };

      workerRef.current.onerror = (err) => {
        const errorMsg = `Worker error: ${err.message}`;
        setError(errorMsg);
        setIsDownloading(false);
        optionsRef.current.onError?.("unknown", errorMsg);
      };
    }

    return workerRef.current;
  }, []);

  // Clean up the worker when component unmounts
  useEffect(() => {
    return () => {
      console.log(
        `[useFileDownloader ${instanceId.current}] Cleaning up worker`
      );
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Download function
  const downloadFile = useCallback(
    (
      fileId: string,
      fileName: string,
      fileType: string,
      chunks: { chunkIndex: number; url: string; size: number }[]
    ) => {
      // Prevent multiple downloads
      if (isDownloading) {
        console.log(
          `[useFileDownloader ${instanceId.current}] Download already in progress, ignoring request`
        );
        return;
      }

      console.log(
        `[useFileDownloader ${instanceId.current}] Starting download of ${fileName}`
      );
      setIsDownloading(true);
      setProgress(null);
      setResult(null);
      setError(null);

      const worker = getWorker();
      worker.postMessage({
        type: "download",
        fileId,
        fileName,
        fileType,
        chunks,
      });
    },
    [getWorker, isDownloading]
  );

  // Cancel download
  const cancelDownload = useCallback(() => {
    console.log(`[useFileDownloader ${instanceId.current}] Canceling download`);
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "cancel" });
      setTimeout(() => {
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
          getWorker(); // Re-initialize for future downloads
        }
        setIsDownloading(false);
        setError("Download cancelled");
        optionsRef.current.onError?.("cancelled", "Download cancelled by user");
      }, 100);
    }
  }, [getWorker]);

  // Function to format bytes
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }, []);

  // Function to format time
  const formatTime = useCallback((milliseconds: number): string => {
    if (!milliseconds || milliseconds < 0) return "calculating...";
    if (milliseconds < 1000) return "less than a second";

    const seconds = Math.floor(milliseconds / 1000);

    if (seconds < 60) return `${seconds} second${seconds !== 1 ? "s" : ""}`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
      if (remainingSeconds === 0) {
        return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
      }
      return `${minutes} minute${
        minutes !== 1 ? "s" : ""
      } ${remainingSeconds} second${remainingSeconds !== 1 ? "s" : ""}`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    }
    return `${hours} hour${hours !== 1 ? "s" : ""} ${remainingMinutes} minute${
      remainingMinutes !== 1 ? "s" : ""
    }`;
  }, []);

  // Function to format speed
  const formatSpeed = useCallback(
    (bytesPerSecond: number): string => {
      return `${formatBytes(bytesPerSecond)}/s`;
    },
    [formatBytes]
  );

  // Function to trigger file download
  const saveFile = useCallback((blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }, []);

  return {
    isDownloading,
    progress,
    result,
    error,
    downloadFile,
    cancelDownload,
    saveFile,
    formatBytes,
    formatTime,
    formatSpeed,
  };
}
