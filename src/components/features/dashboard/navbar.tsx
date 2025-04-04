import { ModeToggle } from "@/components/ui/mode-toggle";
import { MessageSquare } from "lucide-react";
import React from "react";

export function Navbar({ children }: { children: React.ReactNode }) {
  return (
    <header className="border-b p-[14px] flex items-center justify-between w-full">
      {children}

      <div className="flex items-center">
        <MessageSquare className="h-6 w-6 text-[#5865F2] mr-2" />
        <h1 className="text-xl font-semibold">Zotari</h1>
      </div>

      <div className="flex items-center gap-2">
        <ModeToggle />
      </div>
    </header>
  );
}
