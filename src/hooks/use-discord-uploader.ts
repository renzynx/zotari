import { useState, useEffect, useRef, useCallback } from "react";
import {
  createFile,
  markFileComplete,
  addFileChunk,
} from "@/app/actions/files";

// Types for uploader
export interface ChunkStatus {
  id: number;
  status: "pending" | "uploading" | "success" | "error";
  progress: number; // 0-100
  webhookUrl?: string;
  error?: string;
  size: number;
  uploadedBytes: number;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  totalBytes: number;
  uploadedBytes: number;
  overallProgress: number;
  chunks: ChunkStatus[];
  estimatedTimeRemaining?: number;
  uploadSpeed?: number;
}

export interface UploadResult {
  fileId: string;
  fileName: string;
  totalSize: number;
  totalChunks: number;
  successfulChunks: number;
  failedChunks: number;
  totalTime: number;
  averageSpeed: number;
}

// Add to the existing options interface
interface UseDiscordUploaderOptions {
  // Existing options
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (result: UploadResult) => void;
  onError?: (fileId: string, message: string) => void;

  // New options for database integration
  userId?: string; // Current user ID for storing in database
  saveToDatabase?: boolean; // Whether to save uploads in the database
  onChunkUrl?: (chunkData: {
    fileId: string;
    chunkIndex: number;
    discordUrl: string;
    size: number;
    discordFileId?: string;
    messageId?: string;
    webhookUrl?: string;
  }) => void;

  // New option for file completion
  onFileComplete?: (fileId: string) => void;
}

export function useDiscordUploader(options: UseDiscordUploaderOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to store the worker instance to prevent recreation
  const workerRef = useRef<Worker | null>(null);

  // Store a unique ID to help debug multiple instances
  const instanceId = useRef(
    `instance-${Math.random().toString(36).substring(2, 9)}`
  );

  // Track options in a ref to avoid stale closures
  const optionsRef = useRef(options);

  // Add this at the top level of your hook
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Debug any duplicate instances
  useEffect(() => {
    console.log(`[useDiscordUploader] Created instance ${instanceId.current}`);
    return () => {
      console.log(
        `[useDiscordUploader] Destroying instance ${instanceId.current}`
      );
    };
  }, []);

  // Create the worker only once
  const getWorker = useCallback(() => {
    console.log(`[useDiscordUploader ${instanceId.current}] Getting worker`);

    if (!workerRef.current) {
      console.log(
        `[useDiscordUploader ${instanceId.current}] Creating new worker`
      );
      workerRef.current = new Worker(
        new URL("../workers/discord-chunker.worker.ts", import.meta.url)
      );

      workerRef.current.onmessage = (event) => {
        const data = event.data;
        switch (data.type) {
          case "progress":
            setProgress(data);
            optionsRef.current.onProgress?.(data);
            break;
          case "complete":
            setResult(data);
            setIsUploading(false);
            optionsRef.current.onComplete?.(data);
            break;
          case "error":
            setError(data.message);
            setIsUploading(false);
            optionsRef.current.onError?.(data.fileId, data.message);
            break;
          case "chunk-url":
            try {
              // Pass the chunk URL to the caller
              if (optionsRef.current.onChunkUrl) {
                // Safely send complete data to callback
                const chunkData = {
                  fileId: data.fileId || null,
                  chunkIndex:
                    data.chunkIndex !== undefined ? data.chunkIndex : -1,
                  discordUrl: data.discordUrl || "",
                  size: data.size || 0,
                  discordFileId: data.discordFileId || null,
                  messageId: data.messageId || null,
                  webhookUrl: data.webhookUrl || null,
                };

                // Make sure fileId and chunkIndex are valid before calling onChunkUrl
                if (chunkData.fileId && chunkData.chunkIndex >= 0) {
                  optionsRef.current.onChunkUrl(chunkData);
                } else {
                  console.error(
                    "Missing required data in chunk-url message:",
                    data
                  );
                }
              }
            } catch (error) {
              console.error("Error processing chunk URL:", error);
            }
            break;

          case "file-complete":
            // New handler for file completion
            if (data.fileId) {
              const actualFileId = data.fileId.startsWith("db_")
                ? data.fileId.replace("db_", "")
                : data.fileId;

              if (optionsRef.current.onFileComplete) {
                optionsRef.current.onFileComplete(actualFileId);
              } else {
                // Default implementation using server action
                markFileComplete(actualFileId)
                  .then(() => {
                    console.log(
                      `Successfully marked file ${actualFileId} as complete`
                    );
                  })
                  .catch((err) => {
                    console.error(
                      `Error marking file ${actualFileId} as complete:`,
                      err
                    );
                  });
              }
            }
            break;
        }
      };

      workerRef.current.onerror = (err) => {
        const errorMsg = `Worker error: ${err.message}`;
        setError(errorMsg);
        setIsUploading(false);
        optionsRef.current.onError?.("unknown", errorMsg);
      };
    }

    return workerRef.current;
  }, []);

  // Clean up the worker when component unmounts
  useEffect(() => {
    return () => {
      console.log(
        `[useDiscordUploader ${instanceId.current}] Cleaning up worker`
      );
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
    };
  }, []);

  // Upload function - add guards against double uploads
  const uploadFile = useCallback(
    async (file: File, webhookUrls: string[], chunkSize?: number) => {
      let dbFileId: string | undefined;

      // Create database record if enabled
      if (optionsRef.current.saveToDatabase) {
        try {
          // Calculate total chunks
          const totalChunks = Math.ceil(
            file.size / (chunkSize || 9 * 1024 * 1024)
          );

          console.log(`Creating database record for file: ${file.name}`);

          // Use server action instead of API route
          const result = await createFile({
            name: file.name,
            type: file.type,
            size: file.size,
            totalChunks,
          });

          if (result && result.fileId) {
            dbFileId = `db_${result.fileId}`; // Add a prefix to indicate it's a DB ID
            console.log(
              `Created database record for file with ID: ${result.fileId}`
            );
          } else {
            console.error("Failed to create file record in database");
          }
        } catch (err) {
          console.error("Error creating file record:", err);
        }
      } else {
        console.log(
          `Skipping database - saveToDatabase: ${optionsRef.current.saveToDatabase}`
        );
      }

      console.log(
        `[useDiscordUploader ${instanceId.current}] Starting upload of ${file.name}`
      );
      setIsUploading(true);
      setProgress(null);
      setResult(null);
      setError(null);

      const worker = getWorker();
      worker.postMessage({
        type: "upload",
        file,
        webhookUrls,
        chunkSize: chunkSize || 9 * 1024 * 1024,
        dbFileId, // Pass the database file ID to the worker
      });

      // Clear any existing timeout
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }

      // Set failsafe timeout - if we don't get a completion after 30 seconds at 100%, force it
      completionTimeoutRef.current = setTimeout(async () => {
        const currentProgress = progress?.overallProgress || 0;

        // If we're at or near 100% but haven't received completion, force it
        if (currentProgress >= 99 && isUploading && !result) {
          console.log("Failsafe: Forcing upload completion after timeout");

          // Create artificial completion result
          const completionResult = {
            type: "complete",
            fileId: dbFileId || file.name,
            fileName: file.name,
            totalSize: file.size,
            totalChunks: Math.ceil(file.size / (chunkSize || 9 * 1024 * 1024)),
            successfulChunks: Math.ceil(
              file.size / (chunkSize || 9 * 1024 * 1024)
            ),
            failedChunks: 0,
            totalTime: 0,
            averageSpeed: 0,
          };

          // Use the onComplete handler directly
          optionsRef.current.onComplete?.(completionResult);

          // Also update our own state
          setResult(completionResult);
          setIsUploading(false);

          // Mark the file as complete
          if (dbFileId && dbFileId.startsWith("db_")) {
            const actualFileId = dbFileId.replace("db_", "");
            try {
              await markFileComplete(actualFileId);
              console.log(
                `Failsafe: Successfully marked file ${actualFileId} as complete`
              );
            } catch (err) {
              console.error(
                `Failsafe: Error marking file ${actualFileId} as complete:`,
                err
              );
            }
          }
        }
      }, 30000); // 30 second timeout
    },
    [getWorker, isUploading, progress]
  );

  // Cancel upload
  const cancelUpload = useCallback(() => {
    console.log(`[useDiscordUploader ${instanceId.current}] Canceling upload`);
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "cancel" });
      setTimeout(() => {
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
          getWorker(); // Re-initialize for future uploads
        }
        setIsUploading(false);
        setError("Upload cancelled");
        optionsRef.current.onError?.("cancelled", "Upload cancelled by user");
      }, 100);
    }
  }, [getWorker]);

  // Utility functions
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    if (!seconds || seconds < 0) return "--";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}m ${secs}s`;
    }
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  }, []);

  const formatSpeed = useCallback(
    (bytesPerSecond: number): string => {
      if (!bytesPerSecond) return "--";
      return `${formatBytes(bytesPerSecond)}/s`;
    },
    [formatBytes]
  );

  return {
    isUploading,
    progress,
    result,
    error,
    uploadFile,
    cancelUpload,
    formatBytes,
    formatTime,
    formatSpeed,
  };
}
