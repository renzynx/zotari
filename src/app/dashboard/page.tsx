import { auth } from "@/auth";
import DashboardPage from "@/components/features/dashboard/dashboard-page";
import { prisma } from "@/prisma";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const session = await auth();

  if (!session || !session.user) {
    return redirect("/");
  }

  const webhooks = await prisma.webhook.findMany({
    where: { userId: session.user.id },
  });

  return <DashboardPage webhooks={webhooks} userId={session.user.id!} />;
}
