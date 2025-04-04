import { redirect } from "next/navigation";
import { prisma } from "@/prisma";
import WebhookManagerClient from "@/components/features/dashboard/webhook-manager-client";
import { auth } from "@/auth";

export default async function WebhooksPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: session.user.email || "" },
    select: { id: true },
  });

  if (!user) {
    redirect("/login");
  }

  // Get webhooks for this user
  const webhooks = await prisma.webhook.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return <WebhookManagerClient webhooks={webhooks} userId={user.id} />;
}
