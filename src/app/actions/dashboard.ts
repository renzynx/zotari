"use server";

import { prisma } from "@/prisma";
import { subDays, parseISO, format, startOfDay, endOfDay } from "date-fns";
import { unstable_cache as cache } from "next/cache";

type StorageData = {
  name: string;
  storage: number;
};

type ActivityData = {
  name: string;
  uploads: number;
  downloads: number;
};

type FileTypeDistribution = {
  name: string;
  value: number;
};

type StorageByType = {
  name: string;
  storage: number;
};

// Helper to categorize files
function categorizeFileType(type: string, name: string): string {
  const extension = name.split(".").pop()?.toLowerCase() || "";

  if (type.startsWith("image/")) return "Images";
  if (type.startsWith("video/")) return "Videos";
  if (type.startsWith("audio/")) return "Audio";

  // Document types
  if (
    [
      "pdf",
      "doc",
      "docx",
      "txt",
      "rtf",
      "odt",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
    ].includes(extension)
  ) {
    return "Documents";
  }

  // Archive types
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(extension)) {
    return "Archives";
  }

  return "Other";
}

// Function to convert bytes to MB
function bytesToMB(bytes: number): number {
  return parseFloat((bytes / 1024 / 1024).toFixed(2));
}

// Calculate growth percentage
function calculateGrowth(current: number, previous: number): string {
  if (previous === 0) return "+100%";
  const growth = ((current - previous) / previous) * 100;
  return growth >= 0 ? `+${growth.toFixed(0)}%` : `${growth.toFixed(0)}%`;
}

// Get dashboard stats
export const getDashboardStats = cache(
  async (userId: string) => {
    try {
      // Get file count
      const totalFiles = await prisma.file.count({
        where: { userId },
      });

      // Get recent uploads (last 7 days)
      const weekAgo = subDays(new Date(), 7);
      const recentUploads = await prisma.file.count({
        where: {
          userId,
          createdAt: {
            gte: weekAgo,
          },
        },
      });

      // Get uploads from previous week for comparison
      const twoWeeksAgo = subDays(new Date(), 14);
      const previousWeekUploads = await prisma.file.count({
        where: {
          userId,
          createdAt: {
            gte: twoWeeksAgo,
            lt: weekAgo,
          },
        },
      });

      // Calculate upload trend
      const uploadsTrend = calculateGrowth(recentUploads, previousWeekUploads);

      // Calculate total storage used in bytes
      const files = await prisma.file.findMany({
        where: { userId },
        select: {
          size: true,
        },
      });

      const totalStorageBytes = files.reduce(
        (acc, file) => acc + (file.size || 0),
        0
      );

      // Convert to appropriate unit (MB, GB, TB)
      let totalStorage: number;
      let storageUnit: string;

      if (totalStorageBytes < 1024 * 1024 * 1024) {
        // Less than 1 GB, show in MB
        totalStorage = bytesToMB(totalStorageBytes);
        storageUnit = "MB";
      } else if (totalStorageBytes < 1024 * 1024 * 1024 * 1024) {
        // Less than 1 TB, show in GB
        totalStorage = parseFloat(
          (totalStorageBytes / 1024 / 1024 / 1024).toFixed(2)
        );
        storageUnit = "GB";
      } else {
        // Show in TB
        totalStorage = parseFloat(
          (totalStorageBytes / 1024 / 1024 / 1024 / 1024).toFixed(2)
        );
        storageUnit = "TB";
      }

      // Calculate storage growth compared to last month
      const monthAgo = subDays(new Date(), 30);
      const monthOldFiles = await prisma.file.findMany({
        where: {
          userId,
          createdAt: {
            lt: monthAgo,
          },
        },
        select: {
          size: true,
        },
      });

      const oldStorageBytes = monthOldFiles.reduce(
        (acc, file) => acc + (file.size || 0),
        0
      );
      const newStorageBytes = totalStorageBytes - oldStorageBytes;
      const storageTrend = calculateGrowth(newStorageBytes, oldStorageBytes);

      return {
        totalFiles,
        recentUploads,
        totalStorage,
        storageUnit,
        uploadsTrend,
        storageTrend,
        // No storage limits - it's UNLIMITED!
        storagePercentage: 0,
        // We can still provide a huge number for display purposes
        storageTier: "UNLIMITED",
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      throw new Error("Failed to fetch dashboard statistics");
    }
  },
  ["dashboard-stats"],
  { revalidate: 300 } // Cache for 5 minutes
);

// Get activity data (uploads and downloads per day for last 7 days)
export const getActivityData = cache(
  async (userId: string): Promise<ActivityData[]> => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date,
        formatted: format(date, "MMM dd"),
        start: startOfDay(date),
        end: endOfDay(date),
      };
    });

    try {
      const result: ActivityData[] = [];

      // For each day, count uploads and downloads
      for (const day of days) {
        // Count uploads
        const uploads = await prisma.file.count({
          where: {
            userId,
            createdAt: {
              gte: day.start,
              lte: day.end,
            },
          },
        });

        // Count downloads (we may need to add a downloads/access log table in the future)
        // For now, we'll simulate with random data based on file count
        const filesCount = await prisma.file.count({ where: { userId } });
        const downloads = Math.min(
          Math.floor(Math.random() * (filesCount > 0 ? filesCount / 3 : 1)),
          uploads * 2
        );

        result.push({
          name: day.formatted,
          uploads,
          downloads,
        });
      }

      return result;
    } catch (error) {
      console.error("Error fetching activity data:", error);
      return days.map((day) => ({
        name: day.formatted,
        uploads: 0,
        downloads: 0,
      }));
    }
  },
  ["activity-data"],
  { revalidate: 3600 } // Cache for 1 hour
);

// Get storage usage data over time
export const getStorageData = cache(
  async (userId: string): Promise<StorageData[]> => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date,
        formatted: format(date, "MMM dd"),
        dayStart: startOfDay(date),
      };
    });

    try {
      const result: StorageData[] = [];

      // For each day, calculate cumulative storage
      for (let i = 0; i < days.length; i++) {
        const day = days[i];

        // Get all files created up to this day
        const files = await prisma.file.findMany({
          where: {
            userId,
            createdAt: {
              lte: day.dayStart,
            },
          },
          select: {
            size: true,
          },
        });

        const storageMB = bytesToMB(
          files.reduce((acc, file) => acc + (file.size || 0), 0)
        );

        result.push({
          name: day.formatted,
          storage: storageMB,
        });
      }

      return result;
    } catch (error) {
      console.error("Error fetching storage data:", error);
      return days.map((day) => ({
        name: day.formatted,
        storage: 0,
      }));
    }
  },
  ["storage-data"],
  { revalidate: 3600 } // Cache for 1 hour
);

// Get file type distribution
export const getFileTypeDistribution = cache(
  async (userId: string): Promise<FileTypeDistribution[]> => {
    try {
      const files = await prisma.file.findMany({
        where: { userId },
        select: {
          type: true,
          name: true,
        },
      });

      const typeCount: Record<string, number> = {};

      files.forEach((file) => {
        const category = categorizeFileType(file.type || "", file.name);
        typeCount[category] = (typeCount[category] || 0) + 1;
      });

      // Convert to array format
      return Object.entries(typeCount).map(([name, value]) => ({
        name,
        value,
      }));
    } catch (error) {
      console.error("Error fetching file type distribution:", error);
      return [{ name: "No Data", value: 1 }];
    }
  },
  ["file-type-distribution"],
  { revalidate: 3600 } // Cache for 1 hour
);

// Get storage by file type
export const getStorageByType = cache(
  async (userId: string): Promise<StorageByType[]> => {
    try {
      const files = await prisma.file.findMany({
        where: { userId },
        select: {
          type: true,
          name: true,
          size: true,
        },
      });

      const typeStorage: Record<string, number> = {};

      files.forEach((file) => {
        const category = categorizeFileType(file.type || "", file.name);
        typeStorage[category] = (typeStorage[category] || 0) + (file.size || 0);
      });

      // Convert to array format and bytes to MB
      return Object.entries(typeStorage).map(([name, bytes]) => ({
        name,
        storage: bytesToMB(bytes),
      }));
    } catch (error) {
      console.error("Error fetching storage by type:", error);
      return [{ name: "No Data", storage: 0 }];
    }
  },
  ["storage-by-type"],
  { revalidate: 3600 } // Cache for 1 hour
);
