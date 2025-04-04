"use client";

import * as React from "react";
import { useCallback, useState, useEffect, useRef } from "react";
import {
  FileIcon,
  UploadCloud,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useDropzone } from "react-dropzone";

import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDiscordUploader } from "@/hooks/use-discord-uploader";
import { markFileComplete, addFileChunk } from "@/app/actions/files";

export type FileWithPreview = {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  preview?: string;
  progress: number;
  status: "idle" | "uploading" | "success" | "error";
  errorMessage?: string;
  uploadStats?: {
    totalTime?: number;
    averageSpeed?: number;
  };
  originalFile: File;
};

interface FileDropzoneProps extends React.HTMLAttributes<HTMLDivElement> {
  onUpload?: (files: FileWithPreview[]) => Promise<void>;
  maxFiles?: number;
  maxSize?: number;
  accept?: Record<string, string[]>;
  disabled?: boolean;
  webhookUrls?: string[];
  onUploadProgress?: (completedFiles: number, totalFiles: number) => void;
  userId?: string;
  saveToDatabase?: boolean;
}

export function FileDropzone({
  onUpload,
  className,
  maxFiles = 10,
  maxSize = 1024 * 1024 * 1024 * 2,
  accept = {},
  disabled = false,
  webhookUrls = [],
  onUploadProgress,
  userId,
  saveToDatabase = false,
  ...props
}: FileDropzoneProps) {
  const filesRef = useRef<FileWithPreview[]>([]);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(-1);
  const [completedFiles, setCompletedFiles] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const dbFileIdsRef = useRef<Record<string, string>>({});

  const processingRef = useRef(false);
  const uploadStatusRef = useRef<{
    lastCompleteTime: number;
    isProcessingComplete: boolean;
  }>({
    lastCompleteTime: 0,
    isProcessingComplete: false,
  });

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const {
    isUploading: isWorkerUploading,
    progress,
    result,
    error,
    uploadFile,
    cancelUpload,
    formatBytes: formatBytesUtil,
    formatTime: formatTimeUtil,
    formatSpeed: formatSpeedUtil,
  } = useDiscordUploader({
    userId,
    saveToDatabase,
    onProgress: (stats) => {
      if (currentFileIndex >= 0 && currentFileIndex < filesRef.current.length) {
        setFiles((prev) => {
          return prev.map((file, index) =>
            index === currentFileIndex
              ? {
                  ...file,
                  progress: Math.max(
                    file.progress,
                    Math.round(stats.overallProgress)
                  ),
                  status:
                    stats.overallProgress >= 100 ? "success" : "uploading",
                }
              : file
          );
        });
      }
    },
    onComplete: async (result) => {
      console.log(`Upload complete for file at index ${currentFileIndex}`);
      uploadStatusRef.current.lastCompleteTime = Date.now();

      if (currentFileIndex >= 0 && currentFileIndex < filesRef.current.length) {
        setFiles((prev) =>
          prev.map((file, index) =>
            index === currentFileIndex
              ? {
                  ...file,
                  progress: 100,
                  status: "success",
                  uploadStats: {
                    totalTime: result.totalTime,
                    averageSpeed: result.averageSpeed,
                  },
                }
              : file
          )
        );

        setCompletedFiles((prev) => {
          const newCount = prev + 1;
          onUploadProgress?.(newCount, filesRef.current.length);
          return newCount;
        });
      }

      uploadStatusRef.current.isProcessingComplete = true;

      setTimeout(() => {
        processNextFile();
      }, 100);
    },
    onError: (fileId, errorMsg) => {
      console.log(
        `Upload error for file at index ${currentFileIndex}: ${errorMsg}`
      );
      uploadStatusRef.current.lastCompleteTime = Date.now();

      if (currentFileIndex >= 0 && currentFileIndex < filesRef.current.length) {
        setFiles((prev) =>
          prev.map((file, index) =>
            index === currentFileIndex
              ? { ...file, status: "error", errorMessage: errorMsg }
              : file
          )
        );

        setCompletedFiles((prev) => {
          const newCount = prev + 1;
          onUploadProgress?.(newCount, filesRef.current.length);
          return newCount;
        });
      }

      uploadStatusRef.current.isProcessingComplete = true;

      setTimeout(() => {
        processNextFile();
      }, 100);
    },
    onChunkUrl: async (chunkData) => {
      if (!saveToDatabase || !userId) return;

      if (
        !chunkData ||
        !chunkData.fileId ||
        chunkData.chunkIndex === undefined
      ) {
        console.error("Invalid chunk data received:", chunkData);
        return;
      }

      try {
        const actualFileId = chunkData.fileId.startsWith("db_")
          ? chunkData.fileId.replace("db_", "")
          : chunkData.fileId;

        console.log(
          `Processing chunk ${chunkData.chunkIndex} for file ${actualFileId}`
        );

        const payload = {
          chunkIndex: chunkData.chunkIndex,
          discordUrl: chunkData.discordUrl || "",
          size: chunkData.size || 0,
          discordFileId: chunkData.discordFileId || null,
          messageId: chunkData.messageId || null,
          webhookUrl: chunkData.webhookUrl || null,
        };

        const result = await addFileChunk(actualFileId, payload);
        if (result && result.success) {
          console.log(
            `Successfully saved chunk ${chunkData.chunkIndex} for file ${actualFileId}`
          );
        }
      } catch (err) {
        console.error("Error saving chunk:", err);
      }
    },
    onFileComplete: async (fileId) => {
      if (!saveToDatabase || !userId || !fileId) return;

      try {
        const actualFileId = fileId.startsWith("db_")
          ? fileId.replace("db_", "")
          : fileId;

        console.log(`Marking file ${actualFileId} as complete`);

        await markFileComplete(actualFileId);

        console.log(`File ${actualFileId} marked as complete`);
      } catch (err) {
        console.error("Error marking file as complete:", err);
      }
    },
  });

  const processNextFile = useCallback(() => {
    if (processingRef.current) return;

    processingRef.current = true;

    try {
      const currentFiles = filesRef.current;
      const nextIndex = currentFiles.findIndex(
        (file) => file.status === "idle" || file.status === "error"
      );

      if (nextIndex >= 0) {
        const file = currentFiles[nextIndex];
        console.log(
          `Processing file ${nextIndex + 1}/${currentFiles.length}: ${
            file.name
          }`
        );

        setCurrentFileIndex(nextIndex);

        setTimeout(() => {
          uploadFile(file.originalFile, webhookUrls);
        }, 10);
      } else {
        console.log("No more files to process, completing upload");
        setIsUploading(false);
        setUploadComplete(true);
        setCurrentFileIndex(-1);
        onUpload?.(currentFiles);
      }
    } finally {
      setTimeout(() => {
        processingRef.current = false;
      }, 100);
    }
  }, [webhookUrls, onUpload, uploadFile]);

  const startUpload = useCallback(() => {
    if (isUploading || files.length === 0) return;

    console.log(`Starting upload of ${files.length} files`);
    setIsUploading(true);
    setUploadComplete(false);
    setCompletedFiles(0);

    setFiles((prev) =>
      prev.map((file) => ({
        ...file,
        progress: 0,
        status: "idle",
        errorMessage: undefined,
      }))
    );

    setTimeout(() => {
      processNextFile();
    }, 50);
  }, [files, isUploading, processNextFile]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        preview: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
        progress: 0,
        status: "idle" as const,
        originalFile: file,
      }));

      setFiles((prev) => {
        const activeFiles = prev.filter((file) => file.status !== "success");
        const filteredPrev = activeFiles.filter(
          (p) => !newFiles.some((n) => n.name === p.name && n.size === p.size)
        );
        return [...filteredPrev, ...newFiles].slice(0, maxFiles);
      });

      setUploadComplete(false);
      setCompletedFiles(0);
    },
    [maxFiles]
  );

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => {
      const newFiles = prev.filter((f) => f.id !== fileId);

      const removedFile = prev.find((f) => f.id === fileId);
      if (removedFile?.preview) {
        URL.revokeObjectURL(removedFile.preview);
      }

      return newFiles;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept,
      maxSize,
      maxFiles,
      disabled: disabled || isUploading || isWorkerUploading,
    });

  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files]);

  const getFileType = (fileName: string) => {
    if (!fileName) return "unknown";

    const extension = fileName.split(".").pop()?.toLowerCase() || "";
    return extension;
  };

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(1)} B/s`;
    if (bytesPerSecond < 1024 * 1024)
      return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatTime = (timeMs: number) => {
    const seconds = Math.floor(timeMs / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const allFilesUploaded =
    files.length > 0 && files.every((file) => file.status === "success");

  return (
    <div className={cn("space-y-4", className)} {...props}>
      <div
        {...getRootProps()}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-8 transition-colors",
          isDragActive && !isDragReject && "border-primary/50 bg-primary/5",
          isDragReject && "border-destructive/50 bg-destructive/5",
          !isDragActive &&
            !isDragReject &&
            "border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5",
          (disabled || isUploading) && "pointer-events-none opacity-60",
          className
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <div className="rounded-full bg-muted/50 p-3">
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="flex flex-col space-y-1">
            <p className="text-base font-medium">
              {isDragActive
                ? isDragReject
                  ? "Some files are not allowed"
                  : "Drop the files here"
                : "Drag & drop files here"}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse files
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Accepts every files up to {formatBytes(maxSize)}
            {webhookUrls.length > 0 &&
              " (Files will be chunked into 9MB pieces)"}
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <ScrollArea className="max-h-[200px] overflow-scroll p-1">
            <div className="grid gap-3">
              {files.map((file, index) => (
                <div
                  key={file.id}
                  className={cn(
                    "relative flex items-center rounded-lg border p-3",
                    file.status === "error" &&
                      "border-destructive/50 bg-destructive/5",
                    index === currentFileIndex && "border-primary"
                  )}
                >
                  <div className="flex flex-1 items-center gap-3 overflow-hidden">
                    <div className="shrink-0">
                      {file.preview ? (
                        <div className="h-12 w-12 rounded-md overflow-hidden border">
                          <img
                            src={file.preview || "/placeholder.svg"}
                            alt={file.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted/30">
                          <FileIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-1">
                        <p className="truncate text-sm font-medium">
                          {file.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{getFileType(file.name).toUpperCase()}</span>
                        <span>•</span>
                        <span>{formatBytes(file.size)}</span>
                      </div>
                      <div className="mt-2 w-full">
                        <Progress
                          value={file.progress}
                          className={cn(
                            "h-1.5 w-full",
                            file.status === "error" && "bg-destructive/25",
                            file.status === "success" && "bg-primary/25"
                          )}
                          indicatorClassName={cn(
                            file.status === "error" && "bg-destructive",
                            file.status === "success" && "bg-primary"
                          )}
                        />
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <div>
                            {file.status === "error" ? (
                              <div className="flex items-center text-destructive">
                                <AlertCircle className="mr-1 h-3 w-3" />
                                <span>
                                  {file.errorMessage || "Upload failed"}
                                </span>
                              </div>
                            ) : file.status === "success" ? (
                              <div className="flex items-center text-primary">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                <span>Upload complete</span>
                              </div>
                            ) : file.status === "uploading" ? (
                              <span className="text-muted-foreground">
                                Uploading... {Math.round(file.progress)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                Ready to upload
                              </span>
                            )}
                          </div>
                          {file.uploadStats && (
                            <div className="flex items-center text-muted-foreground gap-2">
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatTime(file.uploadStats.totalTime || 0)}
                              </span>
                              <span>
                                {formatSpeed(
                                  file.uploadStats.averageSpeed || 0
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-auto pl-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeFile(file.id)}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove file</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {files.length} {files.length === 1 ? "file" : "files"} selected
              </p>
              {isUploading && (
                <p className="text-xs text-muted-foreground">
                  {completedFiles}/{files.length} completed
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isUploading && isWorkerUploading) {
                    cancelUpload();
                  }

                  files.forEach((file) => {
                    if (file.preview) {
                      URL.revokeObjectURL(file.preview);
                    }
                  });

                  setFiles([]);
                  setUploadComplete(false);
                  setCompletedFiles(0);
                  setCurrentFileIndex(-1);
                }}
                disabled={files.length === 0 || isUploading}
              >
                {isUploading ? "Cancel" : "Clear all"}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={startUpload}
                disabled={files.length === 0 || isUploading || allFilesUploaded}
                className={cn(
                  allFilesUploaded && "bg-green-600 hover:bg-green-700"
                )}
              >
                {isUploading
                  ? `Uploading... ${Math.round(
                      (completedFiles / files.length) * 100
                    )}%`
                  : allFilesUploaded
                  ? "Uploaded Successfully"
                  : webhookUrls.length > 0
                  ? "Upload to Discord"
                  : "Upload Files"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
