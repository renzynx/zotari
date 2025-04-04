import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TypeFilter } from "./type-filter";
import { StatusFilter } from "./status-filter";
import { DateFilter } from "./date-filter";

interface FilterBarProps {
  sortBy: "name" | "date" | "size";
  setSortBy: (value: "name" | "date" | "size") => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (value: "asc" | "desc") => void;
  selectedTypes: string[];
  setSelectedTypes: (value: string[]) => void;
  selectedStatus: string[];
  setSelectedStatus: (value: string[]) => void;
  dateRange: "all" | "recent" | "month" | "older";
  setDateRange: (value: "all" | "recent" | "month" | "older") => void;
  resetFilters: () => void;
  fileTypes: string[];
  searchQuery: string;
}

export function FilterBar({
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  selectedTypes,
  setSelectedTypes,
  selectedStatus,
  setSelectedStatus,
  dateRange,
  setDateRange,
  resetFilters,
  fileTypes,
  searchQuery,
}: FilterBarProps) {
  const showResetButton =
    searchQuery ||
    selectedTypes.length > 0 ||
    selectedStatus.length > 0 ||
    dateRange !== "all";

  return (
    <div className="flex items-center space-x-2 flex-wrap md:justify-end gap-2">
      {/* Sort dropdown */}
      <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date">Date</SelectItem>
          <SelectItem value="name">Name</SelectItem>
          <SelectItem value="size">Size</SelectItem>
        </SelectContent>
      </Select>

      {/* Order toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        className="h-10 w-10"
      >
        {sortOrder === "asc" ? "↑" : "↓"}
      </Button>

      {/* Type filter */}
      <TypeFilter
        selectedTypes={selectedTypes}
        setSelectedTypes={setSelectedTypes}
        fileTypes={fileTypes}
      />

      {/* Status filter */}
      <StatusFilter
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
      />

      {/* Date filter */}
      <DateFilter dateRange={dateRange} setDateRange={setDateRange} />

      {/* Reset button */}
      {showResetButton && (
        <Button variant="ghost" onClick={resetFilters}>
          Reset
        </Button>
      )}
    </div>
  );
}
