import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format bytes to a human-readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function getFileStatus(file: {
  status: string;
  chunks: any[];
  totalChunks: number;
}) {
  if (file.status === "COMPLETE") return "Complete";
  if (file.status === "PENDING") {
    const completeChunks = file.chunks.length;
    if (completeChunks === 0) return "Empty";
    if (completeChunks < file.totalChunks) return "Partial";
    return "Ready";
  }
  return file.status;
}

export function getStatusBadge(status: string) {
  switch (status) {
    case "Complete":
    case "Ready":
      return "success";
    case "Partial":
      return "warning";
    case "Empty":
      return "destructive";
    default:
      return "secondary";
  }
}

export function getFileIcon(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "pdf") return "📄";
  if (["jpg", "jpeg", "png", "gif"].includes(extension || "")) return "🖼️";
  if (["mp3", "wav", "ogg"].includes(extension || "")) return "🎵";
  if (["mp4", "webm", "mov"].includes(extension || "")) return "🎬";
  if (["zip", "rar", "7z"].includes(extension || "")) return "📦";
  if (["doc", "docx"].includes(extension || "")) return "📝";
  if (["xls", "xlsx"].includes(extension || "")) return "📊";
  if (["ppt", "pptx"].includes(extension || "")) return "📊";

  return "📄";
}

export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}
