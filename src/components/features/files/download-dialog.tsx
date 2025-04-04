import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, XCircle } from "lucide-react";
import { getFileIcon } from "@/lib/utils";

interface DownloadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeFile: any;
  isDownloading: boolean;
  progress: any;
  onCancel: () => void;
  formatBytes: (bytes: number) => string;
  formatTime: (ms: number) => string;
  formatSpeed: (bytesPerSecond: number) => string;
}

export function DownloadDialog({
  isOpen,
  onOpenChange,
  activeFile,
  isDownloading,
  progress,
  onCancel,
  formatBytes,
  formatTime,
  formatSpeed,
}: DownloadDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {activeFile && (
              <>
                <span className="text-xl mr-2">
                  {getFileIcon(activeFile.name)}
                </span>
                Downloading {activeFile.name}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isDownloading ? "Download in progress..." : "Download complete!"}
          </DialogDescription>
        </DialogHeader>

        {isDownloading && progress && (
          <div className="space-y-4 my-4">
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                {formatBytes(progress.downloadedBytes)} of{" "}
                {formatBytes(progress.totalBytes)}
              </span>
              <span className="font-medium">{progress.overallProgress}%</span>
            </div>

            <Progress value={progress.overallProgress} className="h-2" />

            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="flex flex-col">
                <span className="text-xs uppercase text-muted-foreground mb-1">
                  Speed
                </span>
                <span className="font-medium">
                  {formatSpeed(progress.speed)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase text-muted-foreground mb-1">
                  Remaining
                </span>
                <span className="font-medium">
                  {formatTime(progress.estimatedTimeLeft)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase text-muted-foreground mb-1">
                  Chunks
                </span>
                <span className="font-medium">
                  {progress.currentChunk} of {progress.totalChunks}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase text-muted-foreground mb-1">
                  File Size
                </span>
                <span className="font-medium">
                  {formatBytes(progress.totalBytes)}
                </span>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button
                variant="destructive"
                onClick={() => {
                  onCancel();
                  onOpenChange(false);
                }}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Download
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
