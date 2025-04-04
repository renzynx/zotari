"use server";

import { prisma } from "@/prisma";
import { unstable_cache as cache } from "next/cache";

export type WebhookWithUrl = {
  id: string;
  url: string;
};

export const getUserWebhooks = cache(
  async (userId: string): Promise<WebhookWithUrl[]> => {
    if (!userId) {
      return [];
    }

    try {
      const webhooks = await prisma.webhook.findMany({
        where: { userId },
        select: {
          id: true,
          url: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return webhooks;
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      return [];
    }
  },
  ["user-webhooks"],
  { revalidate: 60 } // Cache for 1 minute
);

export const addWebhooks = async (webhooks: string[], userId: string) => {
  const existingWebhooks = await prisma.webhook.findMany({
    where: { userId },
  });

  const existingUrls = existingWebhooks.map((webhook) => webhook.url);

  const newWebhooks = webhooks.filter((url) => !existingUrls.includes(url));

  await prisma.webhook.createMany({
    data: newWebhooks.map((url) => ({
      url,
      userId,
    })),
  });
};

export const deleteWebhook = async (webhookId: string, userId: string) => {
  if (!webhookId || !userId) {
    throw new Error("Webhook ID and user ID are required");
  }

  try {
    await prisma.webhook.delete({
      where: {
        id: webhookId,
        userId: userId,
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting webhook:", error);
    throw new Error("Failed to delete webhook");
  }
};
