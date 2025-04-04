interface FileCountInfoProps {
  indexOfFirstFile: number;
  indexOfLastFile: number;
  filteredFilesCount: number;
  totalFilesCount: number;
}

export function FileCountInfo({
  indexOfFirstFile,
  indexOfLastFile,
  filteredFilesCount,
  totalFilesCount,
}: FileCountInfoProps) {
  return (
    <div className="text-sm text-muted-foreground mb-4">
      Showing {indexOfFirstFile + 1}-
      {Math.min(indexOfLastFile, filteredFilesCount)} of {filteredFilesCount}{" "}
      files
      {totalFilesCount !== filteredFilesCount && (
        <span> (filtered from {totalFilesCount} total)</span>
      )}
    </div>
  );
}
