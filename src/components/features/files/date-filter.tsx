import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "lucide-react";

interface DateFilterProps {
  dateRange: "all" | "recent" | "month" | "older";
  setDateRange: (value: "all" | "recent" | "month" | "older") => void;
}

export function DateFilter({ dateRange, setDateRange }: DateFilterProps) {
  const getDateLabel = () => {
    if (dateRange === "all") return "All Time";
    if (dateRange === "recent") return "Recent";
    if (dateRange === "month") return "Last Month";
    return "Older";
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-[130px]">
          <Calendar className="h-4 w-4 mr-2" />
          {getDateLabel()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-4">
        <div className="space-y-4">
          <h4 className="font-medium">Date Range</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="date-all"
                checked={dateRange === "all"}
                onCheckedChange={(checked) => {
                  if (checked) setDateRange("all");
                }}
              />
              <label htmlFor="date-all" className="text-sm">
                All Time
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="date-recent"
                checked={dateRange === "recent"}
                onCheckedChange={(checked) => {
                  if (checked) setDateRange("recent");
                }}
              />
              <label htmlFor="date-recent" className="text-sm">
                Recent (7 days)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="date-month"
                checked={dateRange === "month"}
                onCheckedChange={(checked) => {
                  if (checked) setDateRange("month");
                }}
              />
              <label htmlFor="date-month" className="text-sm">
                Last Month
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="date-older"
                checked={dateRange === "older"}
                onCheckedChange={(checked) => {
                  if (checked) setDateRange("older");
                }}
              />
              <label htmlFor="date-older" className="text-sm">
                Older
              </label>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
