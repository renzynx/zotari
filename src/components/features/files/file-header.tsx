import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface FileHeaderProps {
  onRefresh: () => void;
}

export function FileHeader({ onRefresh }: FileHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-3xl font-bold">Your Files</h1>
      <Button onClick={onRefresh} variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh
      </Button>
    </div>
  );
}
