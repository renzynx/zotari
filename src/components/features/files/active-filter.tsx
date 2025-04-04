import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface ActiveFiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedTypes: string[];
  setSelectedTypes: (value: string[]) => void;
  selectedStatus: string[];
  setSelectedStatus: (value: string[]) => void;
  dateRange: "all" | "recent" | "month" | "older";
  setDateRange: (value: "all" | "recent" | "month" | "older") => void;
}

export function ActiveFilters({
  searchQuery,
  setSearchQuery,
  selectedTypes,
  setSelectedTypes,
  selectedStatus,
  setSelectedStatus,
  dateRange,
  setDateRange,
}: ActiveFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {searchQuery && (
        <Badge variant="secondary" className="flex items-center gap-1">
          Search: {searchQuery}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => setSearchQuery("")}
          />
        </Badge>
      )}

      {selectedTypes.map((type) => (
        <Badge
          key={type}
          variant="secondary"
          className="flex items-center gap-1"
        >
          Type: {type}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() =>
              setSelectedTypes(selectedTypes.filter((t) => t !== type))
            }
          />
        </Badge>
      ))}

      {selectedStatus.map((status) => (
        <Badge
          key={status}
          variant="secondary"
          className="flex items-center gap-1"
        >
          Status: {status}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() =>
              setSelectedStatus(selectedStatus.filter((s) => s !== status))
            }
          />
        </Badge>
      ))}

      {dateRange !== "all" && (
        <Badge variant="secondary" className="flex items-center gap-1">
          Date:{" "}
          {dateRange === "recent"
            ? "Recent"
            : dateRange === "month"
            ? "Last Month"
            : "Older"}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => setDateRange("all")}
          />
        </Badge>
      )}
    </div>
  );
}
