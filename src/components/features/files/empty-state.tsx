import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Cloud } from "lucide-react";

interface EmptyStateProps {
  hasFiles: boolean;
  resetFilters: () => void;
}

export function EmptyState({ hasFiles, resetFilters }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <div className="flex justify-center mb-4">
          <Cloud className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">
          {hasFiles ? "No matching files" : "No files found"}
        </h3>
        <p className="text-muted-foreground mb-4">
          {hasFiles
            ? "Try adjusting your filters to find what you're looking for."
            : "You haven't uploaded any files yet."}
        </p>
        {hasFiles ? (
          <Button variant="outline" onClick={resetFilters}>
            Reset Filters
          </Button>
        ) : (
          <Button asChild variant="outline">
            <a href="/dashboard">Go to Upload</a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
