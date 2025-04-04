import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileTable } from "@/components/features/files/file-table";

interface FileTabViewProps {
  currentFiles: any[];
  formatBytes: (bytes: number) => string;
  onDownload: (file: any) => void;
  onViewDetails: (file: any) => void;
  onRename: (file: any) => void;
  onDelete: (file: any) => void;
}

export function FileTabView({
  currentFiles,
  formatBytes,
  onDownload,
  onViewDetails,
  onRename,
  onDelete,
}: FileTabViewProps) {
  return (
    <Tabs defaultValue="all" className="mb-8">
      <TabsList>
        <TabsTrigger value="all">All Files</TabsTrigger>
        <TabsTrigger value="complete">Ready to Download</TabsTrigger>
        <TabsTrigger value="pending">Incomplete</TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-4">
        <FileTable
          files={currentFiles}
          formatBytes={formatBytes}
          onDownload={onDownload}
          onViewDetails={onViewDetails}
          onRename={onRename}
          onDelete={onDelete}
        />
      </TabsContent>

      <TabsContent value="complete" className="mt-4">
        <FileTable
          files={currentFiles.filter(
            (f) => f.status === "COMPLETE" || f.chunks.length >= f.totalChunks
          )}
          formatBytes={formatBytes}
          onDownload={onDownload}
          onViewDetails={onViewDetails}
          onRename={onRename}
          onDelete={onDelete}
        />
      </TabsContent>

      <TabsContent value="pending" className="mt-4">
        <FileTable
          files={currentFiles.filter(
            (f) => f.status === "PENDING" && f.chunks.length < f.totalChunks
          )}
          formatBytes={formatBytes}
          onDownload={onDownload}
          onViewDetails={onViewDetails}
          onRename={onRename}
          onDelete={onDelete}
        />
      </TabsContent>
    </Tabs>
  );
}
