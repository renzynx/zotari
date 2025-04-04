"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDropzone } from "@/components/features/dashboard/file-dropzone";
import { InfoIcon, UploadCloud } from "lucide-react";
import { getUserWebhooks, WebhookWithUrl } from "@/app/actions/webhooks";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [webhooks, setWebhooks] = useState<WebhookWithUrl[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    completed: 0,
    total: 0,
  });
  const [activeTab, setActiveTab] = useState("upload");

  // Fix the useEffect to avoid setting state during render
  useEffect(() => {
    // Define our fetch function outside any render or conditional
    const fetchWebhooks = async () => {
      if (!session?.user?.id) return;

      setIsLoading(true);
      try {
        const webhooksData = await getUserWebhooks(session.user.id);
        setWebhooks(webhooksData);
      } catch (error) {
        console.error("Error fetching webhooks:", error);
        toast.error("Failed to load webhooks", {
          description: "Please try refreshing the page",
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if we have a user ID
    if (session?.user?.id) {
      fetchWebhooks();
    }
  }, [session?.user?.id]);

  // Safely handle upload progress updates
  const handleUploadProgress = useCallback(
    (completed: number, total: number) => {
      setUploadProgress({ completed, total });

      if (completed === total && total > 0) {
        setTimeout(() => {
          toast.success(`Successfully uploaded ${total} files`, {
            description: "You can view and manage your files in the Files tab",
          });
        }, 1500);
      }
    },
    []
  );

  // Loading state
  if (status === "loading") {
    return (
      <div className="container py-10 p-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center h-60">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Unauthenticated state
  if (status === "unauthenticated") {
    return (
      <div className="container py-10 mx-auto p-5">
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertTitle>Authentication required</AlertTitle>
              <AlertDescription>
                Please sign in to access this page.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get webhook URLs for the dropzone
  const webhookUrls = webhooks.map((webhook) => webhook.url);

  return (
    <div className="container max-w-5xl py-10 mx-auto p-5">
      <h1 className="text-3xl font-bold mb-6">Upload Files</h1>

      <Tabs value={activeTab} className="mb-8" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-[400px]">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="info">Instructions</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadCloud className="h-6 w-6" />
                File Uploader
              </CardTitle>
              <CardDescription>
                Upload your files to Discord.{" "}
                {webhookUrls.length === 0 && !isLoading && (
                  <span className="text-amber-500">
                    Warning: No webhooks configured. Please add webhooks in the
                    webhook manager.
                  </span>
                )}
                {isLoading && (
                  <span className="text-muted-foreground">
                    Loading webhooks...
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadProgress.total > 0 &&
                uploadProgress.completed < uploadProgress.total && (
                  <div className="mb-6">
                    <Alert>
                      <AlertTitle>Upload in progress</AlertTitle>
                      <AlertDescription>
                        Uploading {uploadProgress.completed} of{" "}
                        {uploadProgress.total} files...
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

              {webhookUrls.length === 0 && !isLoading ? (
                <div className="border border-dashed rounded-lg p-8 text-center">
                  <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No webhooks configured
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    You need to add at least one Discord webhook to upload
                    files.
                  </p>
                  <Button
                    onClick={() => router.push("/dashboard/webhooks")}
                    className="mx-auto"
                  >
                    Manage Webhooks
                  </Button>
                </div>
              ) : (
                <FileDropzone
                  webhookUrls={webhookUrls}
                  disabled={webhookUrls.length === 0 || isLoading}
                  onUploadProgress={handleUploadProgress}
                  userId={session?.user?.id}
                  saveToDatabase={true}
                  maxFiles={10}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <InfoIcon className="h-6 w-6" />
                Upload Instructions
              </CardTitle>
              <CardDescription>
                How to use the file upload system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">How it works</h3>
                <p className="text-muted-foreground">
                  Files are chunked into smaller pieces (max 9MB each) and
                  uploaded to Discord via webhooks. This allows storing files of
                  virtually any size by splitting them into manageable chunks.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Before uploading</h3>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Configure webhooks in the webhook manager</li>
                  <li>More webhooks = faster uploads and better redundancy</li>
                  <li>
                    Make sure your webhooks are valid Discord webhook URLs
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Upload process</h3>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Drag and drop files or click to select files</li>
                  <li>Click "Upload to Discord" to start the upload process</li>
                  <li>Wait for the uploads to complete</li>
                  <li>Files will be available in the Files section</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
