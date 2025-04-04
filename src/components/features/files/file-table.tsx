import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DownloadCloud,
  FileText,
  Info,
  MoreVertical,
  Trash2Icon as Trash2,
} from "lucide-react";
import {
  formatDate,
  getFileIcon,
  getFileStatus,
  getStatusBadge,
} from "@/lib/utils";
import { FileStatusBadge } from "./file-status-badge";

interface File {
  id: string;
  name: string;
  size: number;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  uniqueId: string;
  totalChunks: number;
  chunks: {
    id: string;
    chunkIndex: number;
    discordUrl: string;
    size: number;
  }[];
}

interface FileTableProps {
  files: File[];
  formatBytes: (bytes: number) => string;
  onDownload: (file: File) => void;
  onViewDetails: (file: File) => void;
  onRename: (file: File) => void;
  onDelete: (file: File) => void;
}

export function FileTable({
  files,
  formatBytes,
  onDownload,
  onViewDetails,
  onRename,
  onDelete,
}: FileTableProps) {
  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No files in this category
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Name</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Chunks</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <FileTableRow
              key={file.id}
              file={file}
              formatBytes={formatBytes}
              onDownload={onDownload}
              onViewDetails={onViewDetails}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface FileTableRowProps {
  file: File;
  formatBytes: (bytes: number) => string;
  onDownload: (file: File) => void;
  onViewDetails: (file: File) => void;
  onRename: (file: File) => void;
  onDelete: (file: File) => void;
}

function FileTableRow({
  file,
  formatBytes,
  onDownload,
  onViewDetails,
  onRename,
  onDelete,
}: FileTableRowProps) {
  const fileStatus = getFileStatus(file);
  const statusColor = getStatusBadge(fileStatus);

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <div className="text-xl">{getFileIcon(file.name)}</div>
          <span className="truncate max-w-[220px]" title={file.name}>
            {file.name}
          </span>
        </div>
      </TableCell>
      <TableCell>{formatBytes(file.size)}</TableCell>
      <TableCell>
        <Badge variant="outline" className="uppercase">
          {file.type.split("/")[1] || file.type}
        </Badge>
      </TableCell>
      <TableCell>
        <FileStatusBadge file={file} />
      </TableCell>
      <TableCell>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline">
                {file.chunks.length}/{file.totalChunks}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {file.chunks.length} of {file.totalChunks} chunks available
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell>{formatDate(file.createdAt)}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={fileStatus === "Empty" || !file.chunks.length}
              onClick={() => onDownload(file)}
            >
              <DownloadCloud className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewDetails(file)}>
              <Info className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename(file)}>
              <FileText className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(file)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
