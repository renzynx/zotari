"use server";

import { auth } from "@/auth";
import { FileStatus } from "@/lib/constants";
import { prisma } from "@/prisma";
import { revalidatePath } from "next/cache";

export interface CreateFileParams {
  name: string;
  type: string;
  size: number;
  totalChunks: number;
}

// Get all files for current user
export async function getFiles() {
  try {
    // Verify user is authorized
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get all files belonging to the user
    const files = await prisma.file.findMany({
      where: {
        userId: user.id,
      },
      include: {
        chunks: {
          select: {
            id: true,
            chunkIndex: true,
            discordUrl: true,
            size: true,
          },
          orderBy: {
            chunkIndex: "asc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return {
      success: true,
      files,
    };
  } catch (error) {
    console.error("Error fetching files:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch files",
      files: [],
    };
  }
}

// Rename a file
export async function renameFile(fileId: string, newName: string) {
  try {
    // Verify user is authorized
    const session = await auth();

    if (!session?.user?.email) {
      throw new Error("Unauthorized");
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Find the file and make sure it belongs to the user
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: user.id,
      },
    });

    if (!file) {
      throw new Error("File not found");
    }

    // Update the file name
    await prisma.file.update({
      where: { id: fileId },
      data: { name: newName },
    });

    // Refresh the UI
    revalidatePath("/dashboard/files");

    return { success: true };
  } catch (error) {
    console.error("Error renaming file:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to rename file",
    };
  }
}

// Delete a file
export async function deleteFile(fileId: string) {
  try {
    // Verify user is authorized
    const session = await auth();

    if (!session?.user?.email) {
      throw new Error("Unauthorized");
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Find the file and make sure it belongs to the user
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: user.id,
      },
    });

    if (!file) {
      throw new Error("File not found");
    }

    // Delete chunks first
    await prisma.fileChunk.deleteMany({
      where: { fileId },
    });

    // Delete the file
    await prisma.file.delete({
      where: { id: fileId },
    });

    // Refresh the UI
    revalidatePath("/dashboard/files");

    return { success: true };
  } catch (error) {
    console.error("Error deleting file:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete file",
    };
  }
}

export async function createFile(params: CreateFileParams) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: User not authenticated");
  }

  try {
    const file = await prisma.file.create({
      data: {
        name: params.name,
        type: params.type,
        size: params.size,
        totalChunks: params.totalChunks,
        userId: session.user.id,
        status: "uploading",
        uniqueId: crypto.randomUUID(), // Generate a unique ID based on name and timestamp
      },
    });

    return {
      fileId: file.id,
      success: true,
    };
  } catch (error) {
    console.error("Error creating file record:", error);
    throw new Error(
      `Failed to create file record: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function markFileComplete(fileId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized: User not authenticated");
  }

  // Remove the "db_" prefix if present
  const actualFileId = fileId.startsWith("db_")
    ? fileId.replace("db_", "")
    : fileId;

  try {
    // First check if the file exists before updating
    const file = await prisma.file.findFirst({
      where: {
        id: actualFileId,
        userId: session.user.id,
      },
    });

    if (!file) {
      throw new Error(
        `File with ID ${actualFileId} not found or doesn't belong to the current user`
      );
    }

    await prisma.file.update({
      where: {
        id: actualFileId,
        userId: session.user.id, // Security: ensure user owns the file
      },
      data: {
        status: FileStatus.COMPLETE,
      },
    });

    // Revalidate any paths that might display files
    revalidatePath("/dashboard/files");
    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error(`Error marking file ${actualFileId} as complete:`, error);
    throw new Error(
      `Failed to mark file as complete: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function addFileChunk(
  fileId: string,
  {
    chunkIndex,
    discordUrl,
    size,
    discordFileId,
    messageId,
    webhookUrl,
  }: {
    chunkIndex: number;
    discordUrl: string;
    size: number;
    discordFileId?: string | null;
    messageId?: string | null;
    webhookUrl?: string | null;
  }
) {
  // Early validation with better logging
  if (!fileId) {
    console.error("addFileChunk called without fileId");
    throw new Error("File ID is required");
  }

  if (chunkIndex === undefined || chunkIndex === null || chunkIndex < 0) {
    console.error(
      `addFileChunk called with invalid chunkIndex: ${chunkIndex}, fileId: ${fileId}`
    );
    throw new Error("Valid chunk index is required");
  }

  // Get authentication
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized: User not authenticated");
  }

  // Log the incoming request data
  console.log(`Adding chunk ${chunkIndex} for file ${fileId}`);
  console.log("Chunk data:", {
    discordUrl,
    size,
    discordFileId,
    messageId,
    webhookUrl,
  });

  try {
    // Check if the file exists
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: session.user.id,
      },
    });

    if (!file) {
      console.error(`File not found: ${fileId} for user ${session.user.id}`);
      throw new Error("File not found or doesn't belong to the current user");
    }

    // Create or update the chunk record using upsert
    const chunk = await prisma.fileChunk.upsert({
      where: {
        fileId_chunkIndex: {
          fileId,
          chunkIndex,
        },
      },
      update: {
        discordUrl,
        size,
        discordFileId,
        messageId,
        webhookId: webhookUrl, // Make sure this field name matches your schema
      },
      create: {
        fileId,
        chunkIndex,
        discordUrl,
        size,
        discordFileId,
        messageId,
        webhookId: webhookUrl, // Make sure this field name matches your schema
      },
    });

    // Update completed chunks count
    const chunkCount = await prisma.fileChunk.count({
      where: { fileId },
    });

    console.log(`Successfully saved chunk ${chunkIndex} for file ${fileId}`);
    console.log(`Current progress: ${chunkCount}/${file.totalChunks}`);

    // Auto-complete if all chunks are uploaded
    if (file.totalChunks > 0 && chunkCount >= file.totalChunks) {
      console.log(
        `All chunks uploaded for ${fileId}, marking file as complete`
      );
      await prisma.file.update({
        where: { id: fileId },
        data: { status: "COMPLETE" },
      });

      // Revalidate paths
      revalidatePath("/dashboard/files");
      revalidatePath("/dashboard");
    }

    return {
      chunkId: chunk.id,
      success: true,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `Error adding chunk ${chunkIndex} to file ${fileId}:`,
      errorMsg
    );
    throw new Error(`Failed to add file chunk: ${errorMsg}`);
  }
}
