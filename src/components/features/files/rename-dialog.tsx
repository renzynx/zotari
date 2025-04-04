import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckIcon, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { getFileIcon } from "@/lib/utils";

interface RenameDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFile: any;
  initialName: string;
  isProcessing: boolean;
  onRename: (newName: string) => Promise<void>;
}

export function RenameDialog({
  isOpen,
  onOpenChange,
  selectedFile,
  initialName,
  isProcessing,
  onRename,
}: RenameDialogProps) {
  const [newFileName, setNewFileName] = useState(initialName);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onRename(newFileName);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename File</DialogTitle>
          <DialogDescription>Enter a new name for your file</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <div className="text-xl">
                {selectedFile && getFileIcon(selectedFile.name)}
              </div>
              <div className="flex-1">
                <label htmlFor="filename" className="sr-only">
                  File name
                </label>
                <Input
                  id="filename"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="w-full"
                  placeholder="Enter file name"
                  disabled={isProcessing}
                />
              </div>
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
              type="submit"
              disabled={!newFileName.trim() || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Renaming...
                </>
              ) : (
                <>
                  <CheckIcon className="mr-2 h-4 w-4" />
                  Rename
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
