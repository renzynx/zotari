import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SlidersHorizontal } from "lucide-react";

interface StatusFilterProps {
  selectedStatus: string[];
  setSelectedStatus: (value: string[]) => void;
}

export function StatusFilter({
  selectedStatus,
  setSelectedStatus,
}: StatusFilterProps) {
  const handleStatusChange = (status: string, checked: boolean) => {
    if (checked) {
      setSelectedStatus([...selectedStatus, status]);
    } else {
      setSelectedStatus(selectedStatus.filter((s) => s !== status));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-[130px]">
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Status
          {selectedStatus.length > 0 && (
            <Badge className="ml-2 bg-primary text-primary-foreground">
              {selectedStatus.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-4">
        <div className="space-y-4">
          <h4 className="font-medium">Status</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="status-ready"
                checked={selectedStatus.includes("Ready")}
                onCheckedChange={(checked) =>
                  handleStatusChange("Ready", !!checked)
                }
              />
              <label htmlFor="status-ready" className="text-sm">
                Ready
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="status-partial"
                checked={selectedStatus.includes("Partial")}
                onCheckedChange={(checked) =>
                  handleStatusChange("Partial", !!checked)
                }
              />
              <label htmlFor="status-partial" className="text-sm">
                Partial
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="status-empty"
                checked={selectedStatus.includes("Empty")}
                onCheckedChange={(checked) =>
                  handleStatusChange("Empty", !!checked)
                }
              />
              <label htmlFor="status-empty" className="text-sm">
                Empty
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="status-complete"
                checked={selectedStatus.includes("Complete")}
                onCheckedChange={(checked) =>
                  handleStatusChange("Complete", !!checked)
                }
              />
              <label htmlFor="status-complete" className="text-sm">
                Complete
              </label>
            </div>
          </div>
          <div className="flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedStatus([])}
              disabled={selectedStatus.length === 0}
            >
              Clear
            </Button>
            <Button variant="default" size="sm">
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
