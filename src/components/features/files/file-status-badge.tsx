import { Badge } from "@/components/ui/badge";
import { getFileStatus, getStatusBadge } from "@/lib/utils";

interface FileStatusBadgeProps {
  file: {
    status: string;
    chunks: any[];
    totalChunks: number;
  };
}

export function FileStatusBadge({ file }: FileStatusBadgeProps) {
  const status = getFileStatus(file);
  const badgeVariant = getStatusBadge(status);

  return <Badge variant={badgeVariant as any}>{status}</Badge>;
}
