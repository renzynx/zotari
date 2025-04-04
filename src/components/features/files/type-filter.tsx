import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FileType } from "lucide-react";

interface TypeFilterProps {
  selectedTypes: string[];
  setSelectedTypes: (value: string[]) => void;
  fileTypes: string[];
}

export function TypeFilter({
  selectedTypes,
  setSelectedTypes,
  fileTypes,
}: TypeFilterProps) {
  const handleTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setSelectedTypes([...selectedTypes, type]);
    } else {
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-[130px]">
          <FileType className="h-4 w-4 mr-2" />
          File Types
          {selectedTypes.length > 0 && (
            <Badge className="ml-2 bg-primary text-primary-foreground">
              {selectedTypes.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-4">
        <div className="space-y-4">
          <h4 className="font-medium">File Type</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="type-image"
                checked={selectedTypes.includes("image")}
                onCheckedChange={(checked) =>
                  handleTypeChange("image", !!checked)
                }
              />
              <label htmlFor="type-image" className="text-sm">
                Images
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="type-document"
                checked={selectedTypes.includes("document")}
                onCheckedChange={(checked) =>
                  handleTypeChange("document", !!checked)
                }
              />
              <label htmlFor="type-document" className="text-sm">
                Documents
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="type-video"
                checked={selectedTypes.includes("video")}
                onCheckedChange={(checked) =>
                  handleTypeChange("video", !!checked)
                }
              />
              <label htmlFor="type-video" className="text-sm">
                Videos
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="type-archive"
                checked={selectedTypes.includes("archive")}
                onCheckedChange={(checked) =>
                  handleTypeChange("archive", !!checked)
                }
              />
              <label htmlFor="type-archive" className="text-sm">
                Archives
              </label>
            </div>
          </div>

          {fileTypes.length > 0 && (
            <>
              <h4 className="font-medium pt-2">Custom Types</h4>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {fileTypes.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={selectedTypes.includes(type)}
                      onCheckedChange={(checked) =>
                        handleTypeChange(type, !!checked)
                      }
                    />
                    <label
                      htmlFor={`type-${type}`}
                      className="text-sm capitalize"
                    >
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTypes([])}
              disabled={selectedTypes.length === 0}
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
