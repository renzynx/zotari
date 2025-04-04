"use client";

import { useState, useEffect } from "react";
import { useFileDownloader } from "@/hooks/use-file-downloader";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { renameFile, deleteFile, getFiles } from "@/app/actions/files";
import { FileTable } from "@/components/features/files/file-table";
import { DownloadDialog } from "@/components/features/files/download-dialog";
import { DetailsDialog } from "@/components/features/files/details-dialog";
import { RenameDialog } from "@/components/features/files/rename-dialog";
import { DeleteDialog } from "@/components/features/files/delete-dialog";
import { FileHeader } from "@/components/features/files/file-header";
import { SearchBar } from "@/components/features/files/search-bar";
import { FilterBar } from "@/components/features/files/filter-bar";
import { ActiveFilters } from "@/components/features/files/active-filter";
import { FileCountInfo } from "@/components/features/files/file-count-info";
import { FileTabView } from "@/components/features/files/file-tab-view";
import { FilePagination } from "@/components/features/files/pagination";
import { LoadingIndicator } from "@/components/features/files/loading-indicator";
import { EmptyState } from "@/components/features/files/empty-state";

interface File {
  id: string;
  name: string;
  size: number;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  uniqueId: string;
  totalChunks: number;
  chunks: {
    id: string;
    chunkIndex: number;
    discordUrl: string;
    size: number;
  }[];
}

const ITEMS_PER_PAGE = 10;

export default function DownloadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Search and filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<
    "all" | "recent" | "month" | "older"
  >("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const router = useRouter();

  // File downloader hook setup
  const {
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
  } = useFileDownloader({
    onProgress: (progress) => {
      console.log("Download progress:", progress);
    },
    onComplete: (result) => {
      toast.success("Download Complete", {
        description: `${result.fileName} has been downloaded successfully.`,
      });
      saveFile(result.blob, result.fileName);
      setTimeout(() => {
        setIsDownloadDialogOpen(false);
        setActiveFile(null);
      }, 1500);
    },
    onError: (fileId, message) => {
      toast.error("Download Failed", {
        description: message,
      });
      setIsDownloadDialogOpen(false);
      setActiveFile(null);
    },
  });

  // Fetch files with server action
  async function fetchFiles() {
    setLoading(true);

    try {
      const result = await getFiles();

      if (result.success) {
        // @ts-ignore
        setFiles(result.files);
      } else {
        toast.error("Error", {
          description: result.error || "Failed to load files",
        });
      }
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error("Error", {
        description: "Failed to load files. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  // Helper function to check file status
  const getFileStatus = (file: File) => {
    if (file.status === "COMPLETE") return "Complete";
    if (file.status === "PENDING") {
      const completeChunks = file.chunks.length;
      if (completeChunks === 0) return "Empty";
      if (completeChunks < file.totalChunks) return "Partial";
      return "Ready";
    }
    return file.status;
  };

  // Filter and paginate files
  useEffect(() => {
    // Apply filters and search
    let results = [...files];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter((file) =>
        file.name.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (selectedTypes.length > 0) {
      results = results.filter((file) => {
        // Extract file extension
        const extension = file.name.split(".").pop()?.toLowerCase();
        const type = file.type.split("/")[1] || file.type;

        // Check if the type matches any selected types
        return selectedTypes.some((t) => {
          if (t === "image") return file.type.startsWith("image/");
          if (t === "document") {
            return ["pdf", "doc", "docx", "txt"].includes(extension || "");
          }
          if (t === "video") return file.type.startsWith("video/");
          if (t === "audio") return file.type.startsWith("audio/");
          if (t === "archive") {
            return ["zip", "rar", "7z", "tar", "gz"].includes(extension || "");
          }
          return type === t;
        });
      });
    }

    // Apply status filter
    if (selectedStatus.length > 0) {
      results = results.filter((file) => {
        const status = getFileStatus(file);
        return selectedStatus.includes(status);
      });
    }

    // Apply date filter
    if (dateRange !== "all") {
      const now = new Date();
      const dayInMs = 24 * 60 * 60 * 1000;

      results = results.filter((file) => {
        const fileDate = new Date(file.createdAt);
        const daysSinceCreated = Math.floor(
          (now.getTime() - fileDate.getTime()) / dayInMs
        );

        if (dateRange === "recent") return daysSinceCreated < 7; // Last week
        if (dateRange === "month") return daysSinceCreated < 30; // Last month
        if (dateRange === "older") return daysSinceCreated >= 30; // Older than a month
        return true;
      });
    }

    // Apply sorting
    results.sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }

      if (sortBy === "size") {
        return sortOrder === "asc" ? a.size - b.size : b.size - a.size;
      }

      // Default: sort by date
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    setFilteredFiles(results);
    setCurrentPage(1); // Reset to first page when filters change
  }, [
    files,
    searchQuery,
    selectedTypes,
    selectedStatus,
    dateRange,
    sortBy,
    sortOrder,
  ]);

  // Get current page of files
  const indexOfLastFile = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstFile = indexOfLastFile - ITEMS_PER_PAGE;
  const currentFiles = filteredFiles.slice(indexOfFirstFile, indexOfLastFile);
  const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE);

  // Get distinct file types for filter options
  const getUniqueFileTypes = () => {
    const types = new Set<string>();
    files.forEach((file) => {
      const type = file.type.split("/")[1];
      if (type) types.add(type);
    });
    return Array.from(types);
  };

  const fileTypes = getUniqueFileTypes();

  useEffect(() => {
    fetchFiles();
  }, []);

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedTypes([]);
    setSelectedStatus([]);
    setDateRange("all");
    setSortBy("date");
    setSortOrder("desc");
  };

  const handleRefresh = () => {
    fetchFiles();
    router.refresh();
  };

  const handleDownload = async (file: File) => {
    if (file.chunks.length === 0) {
      toast.error("Cannot Download", {
        description: "This file has no chunks available for download.",
      });
      return;
    }

    setActiveFile(file);
    setIsDownloadDialogOpen(true);

    const chunks = file.chunks.map((chunk) => ({
      chunkIndex: chunk.chunkIndex,
      url: chunk.discordUrl,
      size: chunk.size,
    }));

    downloadFile(file.id, file.name, file.type, chunks);
  };

  const handleViewDetails = (file: File) => {
    setSelectedFile(file);
    setIsDetailsDialogOpen(true);
  };

  const handleRenameClick = (file: File) => {
    setSelectedFile(file);
    setNewFileName(file.name);
    setIsRenameDialogOpen(true);
  };

  const handleRename = async () => {
    if (!selectedFile || !newFileName.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await renameFile(selectedFile.id, newFileName);
      if (result.success) {
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === selectedFile.id ? { ...f, name: newFileName } : f
          )
        );
        toast.success("File renamed successfully");
        setIsRenameDialogOpen(false);
        fetchFiles();
      } else {
        toast.error(result.error || "Failed to rename file");
      }
    } catch (error) {
      console.error("Error renaming file:", error);
      toast.error("Failed to rename file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteClick = (file: File) => {
    setSelectedFile(file);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedFile || isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await deleteFile(selectedFile.id);
      if (result.success) {
        setFiles((prevFiles) =>
          prevFiles.filter((f) => f.id !== selectedFile.id)
        );
        toast.success("File deleted successfully");
        setIsDeleteDialogOpen(false);
      } else {
        toast.error(result.error || "Failed to delete file");
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    } finally {
      setIsProcessing(false);
    }
  };

  // Create props for filter controls
  const filterProps = {
    searchQuery,
    setSearchQuery,
    selectedTypes,
    setSelectedTypes,
    selectedStatus,
    setSelectedStatus,
    dateRange,
    setDateRange,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    resetFilters,
    fileTypes,
  };

  return (
    <div className="container py-8 px-4 max-w-6xl mx-auto">
      <FileHeader onRefresh={handleRefresh} />

      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <FilterBar {...filterProps} />
      </div>

      {/* Active filters */}
      {(selectedTypes.length > 0 ||
        selectedStatus.length > 0 ||
        dateRange !== "all" ||
        searchQuery) && (
        <ActiveFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedTypes={selectedTypes}
          setSelectedTypes={setSelectedTypes}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          dateRange={dateRange}
          setDateRange={setDateRange}
        />
      )}

      {/* File count info */}
      <FileCountInfo
        indexOfFirstFile={indexOfFirstFile}
        indexOfLastFile={indexOfLastFile}
        filteredFilesCount={filteredFiles.length}
        totalFilesCount={files.length}
      />

      <FileTabView
        currentFiles={currentFiles}
        formatBytes={formatBytes}
        onDownload={handleDownload}
        onViewDetails={handleViewDetails}
        onRename={handleRenameClick}
        onDelete={handleDeleteClick}
      />

      {/* Pagination */}
      {filteredFiles.length > 0 && (
        <FilePagination
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
        />
      )}

      {loading && <LoadingIndicator />}

      {!loading && filteredFiles.length === 0 && (
        <EmptyState hasFiles={files.length > 0} resetFilters={resetFilters} />
      )}

      {/* Dialog components */}
      <DownloadDialog
        isOpen={isDownloadDialogOpen}
        onOpenChange={setIsDownloadDialogOpen}
        activeFile={activeFile}
        isDownloading={isDownloading}
        progress={progress}
        onCancel={cancelDownload}
        formatBytes={formatBytes}
        formatTime={formatTime}
        formatSpeed={formatSpeed}
      />

      <DetailsDialog
        isOpen={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        selectedFile={selectedFile}
        formatBytes={formatBytes}
        onDownload={handleDownload}
      />

      <RenameDialog
        isOpen={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        selectedFile={selectedFile}
        initialName={newFileName}
        isProcessing={isProcessing}
        onRename={async (name: any) => {
          setNewFileName(name);
          await handleRename();
        }}
      />

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        selectedFile={selectedFile}
        isProcessing={isProcessing}
        onDelete={handleDelete}
        formatBytes={formatBytes}
      />
    </div>
  );
}
