"use server";
import { prisma } from "@/prisma";
import { FileStatus } from "./constants";

export interface UploadedChunk {
  chunkIndex: number;
  discordUrl: string;
  size: number;
  discordFileId?: string;
  messageId?: string;
  webhookId?: string;
}

export interface FileMetadata {
  name: string;
  type: string;
  size: number;
  totalChunks: number;
}

/**
 * Creates a new file entry in the database
 */
export async function createFile(
  userId: string,
  metadata: FileMetadata
): Promise<string> {
  const file = await prisma.file.create({
    data: {
      name: metadata.name,
      type: metadata.type,
      size: metadata.size,
      totalChunks: metadata.totalChunks,
      uniqueId: `${metadata.name}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`,
      userId,
    },
  });

  return file.id;
}

/**
 * Add a chunk to an existing file
 */
export async function addFileChunk(
  fileId: string,
  chunk: UploadedChunk
): Promise<void> {
  try {
    await prisma.fileChunk.create({
      data: {
        fileId,
        chunkIndex: chunk.chunkIndex,
        size: chunk.size,
        discordUrl: chunk.discordUrl,
        discordFileId: chunk.discordFileId,
        messageId: chunk.messageId,
        webhookId: chunk.webhookId,
      },
    });

    // Check if all chunks are uploaded
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: { chunks: true },
    });

    if (file && file.chunks.length === file.totalChunks) {
      // Mark file as complete if all chunks are uploaded
      await prisma.file.update({
        where: { id: fileId },
        data: { status: FileStatus.COMPLETE },
      });
    }
  } catch (error) {
    console.error("Error adding file chunk:", error);
    throw new Error("Failed to add file chunk");
  }
}

/**
 * Get a file with all its chunks
 */
export async function getFile(fileId: string, userId: string) {
  return prisma.file.findUnique({
    where: {
      id: fileId,
      userId, // Ensure user can only access their own files
    },
    include: {
      chunks: {
        orderBy: {
          chunkIndex: "asc",
        },
      },
    },
  });
}

/**
 * Get all files for a user
 */
export async function getUserFiles(userId: string) {
  return prisma.file.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Mark a file as deleted (soft delete)
 */
export async function deleteFile(fileId: string, userId: string) {
  return prisma.file.updateMany({
    where: {
      id: fileId,
      userId, // Ensure user can only delete their own files
    },
    data: {
      status: FileStatus.DELETED,
    },
  });
}
