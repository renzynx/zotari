import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DownloadCloud } from "lucide-react";
import {
  formatDate,
  getFileIcon,
  getFileStatus,
  getStatusBadge,
} from "@/lib/utils";

interface DetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFile: any;
  formatBytes: (bytes: number) => string;
  onDownload: (file: any) => void;
}

export function DetailsDialog({
  isOpen,
  onOpenChange,
  selectedFile,
  formatBytes,
  onDownload,
}: DetailsDialogProps) {
  if (!selectedFile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl mr-2">
              {getFileIcon(selectedFile.name)}
            </span>
            File Details: {selectedFile.name}
          </DialogTitle>
          <DialogDescription>
            Detailed information about your file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold mb-1">File Information</h4>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-3 gap-1 items-center">
                  <span className="text-muted-foreground">Name:</span>
                  <span
                    className="col-span-2 font-medium truncate"
                    title={selectedFile.name}
                  >
                    {selectedFile.name}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 items-center">
                  <span className="text-muted-foreground">Size:</span>
                  <span className="col-span-2">
                    {formatBytes(selectedFile.size)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 items-center">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="col-span-2">{selectedFile.type}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 items-center">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge
                    variant={getStatusBadge(getFileStatus(selectedFile)) as any}
                    className="w-fit"
                  >
                    {getFileStatus(selectedFile)}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-1 items-center">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="col-span-2">
                    {formatDate(selectedFile.createdAt)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 items-center">
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="col-span-2">
                    {formatDate(selectedFile.updatedAt)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-1">Chunk Information</h4>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-3 gap-1 items-center">
                  <span className="text-muted-foreground">Total Chunks:</span>
                  <span className="col-span-2">{selectedFile.totalChunks}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 items-center">
                  <span className="text-muted-foreground">
                    Available Chunks:
                  </span>
                  <span className="col-span-2">
                    {selectedFile.chunks.length}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 items-center">
                  <span className="text-muted-foreground">Completion:</span>
                  <Progress
                    value={
                      (selectedFile.chunks.length / selectedFile.totalChunks) *
                      100
                    }
                    className="h-2 col-span-2"
                  />
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-1">Chunk List</h4>
                <div className="max-h-[120px] overflow-y-auto rounded border p-2">
                  {selectedFile.chunks.map((chunk: any) => (
                    <div
                      key={chunk.id}
                      className="text-xs py-1 flex justify-between"
                    >
                      <span>Chunk {chunk.chunkIndex + 1}</span>
                      <span>{formatBytes(chunk.size)}</span>
                    </div>
                  ))}
                  {selectedFile.chunks.length === 0 && (
                    <div className="text-xs text-muted-foreground py-1">
                      No chunks available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            {selectedFile.chunks.length > 0 && (
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onDownload(selectedFile);
                }}
                className="mr-auto"
              >
                <DownloadCloud className="h-4 w-4 mr-2" />
                Download File
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
