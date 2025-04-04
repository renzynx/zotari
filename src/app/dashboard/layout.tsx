import { auth } from "@/auth";
import { Navbar } from "@/components/features/dashboard/navbar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import React from "react";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your files and webhooks",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || !session.user) {
    return redirect("/");
  }

  return (
    <SidebarProvider>
      <AppSidebar user={session?.user!} />
      <main className="w-full">
        <Navbar>
          <SidebarTrigger />
        </Navbar>
        {children}
      </main>
    </SidebarProvider>
  );
}
