import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircleIcon, Loader2, TrashIcon } from "lucide-react";
import { getFileIcon } from "@/lib/utils";

interface DeleteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFile: any;
  isProcessing: boolean;
  onDelete: () => Promise<void>;
  formatBytes: (bytes: number) => string;
}

export function DeleteDialog({
  isOpen,
  onOpenChange,
  selectedFile,
  isProcessing,
  onDelete,
  formatBytes,
}: DeleteDialogProps) {
  if (!selectedFile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertCircleIcon className="h-5 w-5" />
            Delete File
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this file? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 py-4">
          <div className="text-2xl">{getFileIcon(selectedFile.name)}</div>
          <div className="flex-1">
            <p className="font-medium">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatBytes(selectedFile.size)} •{" "}
              {selectedFile.type.split("/")[1] || selectedFile.type}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <TrashIcon className="mr-2 h-4 w-4" />
                Delete Permanently
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
