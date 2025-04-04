"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Folder, LayoutDashboard, Upload, Webhook } from "lucide-react";
import { User } from "next-auth";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

interface AppSidebarProps {
  user: User;
}

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Upload",
    url: "/dashboard/upload",
    icon: Upload,
  },
  {
    title: "Manage Files",
    url: "/dashboard/files",
    icon: Folder,
  },
  {
    title: "Manage Webhooks",
    url: "/dashboard/webhooks",
    icon: Webhook,
  },
];

export function AppSidebar({ user }: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b">
        <NavUser user={user} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
