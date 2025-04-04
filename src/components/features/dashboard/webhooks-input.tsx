"use client";

import React, { use } from "react";
import { Webhook } from "@prisma/client";
import { toast } from "sonner";
import { Trash } from "lucide-react";
import { addWebhooks, deleteWebhook } from "@/app/actions/webhooks";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export interface WebhooksInputProps {
  webhooks: Webhook[];
  userId: string;
}

export function WebhooksInput({ webhooks, userId }: WebhooksInputProps) {
  const [webhookValue, setWebhookValue] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  const handleClick = React.useCallback(async () => {
    if (!webhookValue) {
      toast.error("Please enter a webhook URL.");
      return;
    }

    const webhooks = webhookValue
      .split(",")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    const discordWebhookRegex =
      /^https:\/\/(?:discordapp\.com|discord\.com)\/api\/webhooks\/\d+\/[\w-]+$/;

    const isValidDiscordWebhook = webhooks.every((url) =>
      discordWebhookRegex.test(url)
    );

    if (!isValidDiscordWebhook) {
      toast.error(
        "Please enter valid Discord webhook URLs. Make sure they are in the correct format."
      );
      return;
    }

    try {
      setLoading(true);
      await addWebhooks(webhooks, userId);
    } catch (error) {
      console.error("Error adding webhooks:", error);
      toast.error("Failed to save webhooks. Please try again.");
    } finally {
      toast.success("Webhooks saved successfully!");
      setLoading(false);
      setWebhookValue("");
    }
  }, [webhookValue, addWebhooks]);

  const handleDelete = React.useCallback(
    async (webhookId: string) => {
      try {
        await deleteWebhook(webhookId, userId);
      } catch (error) {
        console.error("Error deleting webhook:", error);
        toast.error("Failed to delete webhook. Please try again.");
      }
    },
    [webhooks, userId]
  );

  const renderWebhooks = React.useMemo(() => {
    return webhooks.length ? (
      webhooks.map((webhook, i) => (
        <div key={i} className="text-xs border-b flex justify-between p-1">
          <p className="line-clamp-1 max-w-[90%]">
            {webhook.url.substring(0, 50)}...
          </p>
          <Trash
            className="text-destructive ml-4"
            size={15}
            onClick={() => handleDelete(webhook.id)}
          />
        </div>
      ))
    ) : (
      <div className="flex items-center justify-center p-4 text-sm dark:text-gray-500 text-gray-800">
        No webhooks added yet.
      </div>
    );
  }, [webhooks]);

  return (
    <div className="flex flex-col gap-4 max-w-xl w-full mx-auto p-4">
      <Label htmlFor="webhooks" className="font-semibold font-display">
        Webhooks
      </Label>

      <Textarea
        id="webhooks"
        placeholder="Add your webhooks here. You can add multiple webhooks by separating them with commas."
        className="p-2 border rounded max-h-[150px]"
        rows={4}
        value={webhookValue}
        onChange={(e) => setWebhookValue(e.target.value)}
      />
      <p className="text-sm dark:text-gray-500 text-gray-800 select-none">
        You can add multiple webhooks by separating them with commas.
      </p>

      <ScrollArea className="flex flex-col gap-2 text-xs rounded-md max-w-xl p-2 bg-card max-h-24 border">
        {renderWebhooks}
      </ScrollArea>

      <Button className="p-2" onClick={handleClick}>
        {loading ? (
          <Spinner className="ml-2 dark:text-white text-black" size="small" />
        ) : (
          "Save Webhooks"
        )}
      </Button>
    </div>
  );
}
