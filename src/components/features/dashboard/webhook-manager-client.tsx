"use client";

import { useState } from "react";
import { Webhook } from "@prisma/client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WebhooksInput } from "@/components/features/dashboard/webhooks-input";
import { deleteWebhook } from "@/app/actions/webhooks";
import {
  Trash2,
  Link,
  Copy,
  CheckCircle,
  AlertTriangle,
  ListFilter,
  PlusCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface WebhookManagerClientProps {
  webhooks: Webhook[];
  userId: string;
}

export default function WebhookManagerClient({
  webhooks: initialWebhooks,
  userId,
}: WebhookManagerClientProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>(initialWebhooks);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleCopyWebhook = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Webhook URL copied to clipboard");
  };

  const handleDelete = async (webhookId: string) => {
    try {
      await deleteWebhook(webhookId, userId);
      setWebhooks(webhooks.filter((webhook) => webhook.id !== webhookId));
      toast.success("Webhook deleted successfully");
    } catch (error) {
      console.error("Error deleting webhook:", error);
      toast.error("Failed to delete webhook. Please try again.");
    }
  };

  const getWebhookStatus = (webhook: Webhook) => {
    // For now, we'll just return "Active" for all webhooks
    // In a real app, you might want to check if the webhook is still valid
    return "Active";
  };

  const formatWebhookUrl = (url: string) => {
    try {
      const webhookUrl = new URL(url);
      const pathParts = webhookUrl.pathname.split("/");
      // Mask the webhook token (last part of the path)
      if (pathParts.length > 0) {
        const webhookId = pathParts[pathParts.length - 2] || "";
        return `${webhookUrl.origin}/api/webhooks/${webhookId}/•••••••`;
      }
      return url;
    } catch {
      return url;
    }
  };

  return (
    <div className="container max-w-5xl py-10 mx-auto">
      <h1 className="text-3xl font-bold mb-6">Webhook Manager</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Your Webhooks</CardTitle>
                <CardDescription>
                  Manage your Discord webhooks for file storage
                </CardDescription>
              </div>
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1"
              >
                {showAddForm ? (
                  <>
                    <ListFilter className="h-4 w-4" />
                    Show List
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" />
                    Add Webhook
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showAddForm ? (
              <WebhooksInput webhooks={webhooks} userId={userId} />
            ) : (
              <>
                {webhooks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      You haven't added any webhooks yet
                    </p>
                    <Button onClick={() => setShowAddForm(true)}>
                      Add Your First Webhook
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <Badge variant="outline" className="text-sm">
                        {webhooks.length}{" "}
                        {webhooks.length === 1 ? "webhook" : "webhooks"}
                      </Badge>
                    </div>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[350px]">
                              Webhook URL
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Added</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {webhooks.map((webhook) => {
                            const status = getWebhookStatus(webhook);
                            return (
                              <TableRow key={webhook.id}>
                                <TableCell className="font-mono">
                                  <div className="flex items-center gap-2">
                                    <Link className="h-4 w-4 text-muted-foreground" />
                                    <span className="truncate max-w-[300px]">
                                      {formatWebhookUrl(webhook.url)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      status === "Active"
                                        ? "success"
                                        : "destructive"
                                    }
                                    className="flex w-fit items-center gap-1"
                                  >
                                    {status === "Active" ? (
                                      <CheckCircle className="h-3 w-3" />
                                    ) : (
                                      <AlertTriangle className="h-3 w-3" />
                                    )}
                                    {status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="cursor-help">
                                          {formatDistanceToNow(
                                            new Date(webhook.createdAt),
                                            { addSuffix: true }
                                          )}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {new Date(
                                          webhook.createdAt
                                        ).toLocaleString()}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() =>
                                        handleCopyWebhook(webhook.url)
                                      }
                                    >
                                      <Copy className="h-4 w-4" />
                                      <span className="sr-only">
                                        Copy webhook URL
                                      </span>
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleDelete(webhook.id)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">
                                        Delete webhook
                                      </span>
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About Discord Webhooks</CardTitle>
            <CardDescription>
              How to create and use Discord webhooks for file storage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                What are Discord Webhooks?
              </h3>
              <p className="text-muted-foreground">
                Discord webhooks are a simple way to post messages to a Discord
                channel. In this application, we use them to store file chunks
                as attachments in Discord.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">
                How to Create a Discord Webhook
              </h3>
              <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                <li>
                  Open Discord and go to the server where you want to create a
                  webhook
                </li>
                <li>
                  Select a text channel or create a new one specifically for
                  file storage
                </li>
                <li>Right-click on the channel and select "Edit Channel"</li>
                <li>Go to the "Integrations" tab</li>
                <li>Click "Create Webhook" and give it a name</li>
                <li>Click "Copy Webhook URL" and paste it in the form above</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Best Practices</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Create dedicated channels for file storage</li>
                <li>
                  Use multiple webhooks for redundancy and better upload
                  performance
                </li>
                <li>Keep your webhook URLs private and secure</li>
                <li>
                  Don't delete webhook messages in Discord as this will break
                  file downloads
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
