import { auth, signOut } from "@/auth";
import { SignIn } from "@/components/features/sign-in";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default async function Home() {
  const session = await auth();

  if (session) {
    return (
      <div className="flex flex-col items-center gap-5 justify-center min-h-screen">
        <Card className="w-full max-w-md p-6 mx-auto flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold">
            Welcome back, {session.user?.name}!
          </h1>

          <div className="flex justify-evenly w-full">
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>

            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <Button
                className="cursor-pointer"
                variant="outline"
                type="submit"
              >
                Sign Out
              </Button>
            </form>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn />
    </div>
  );
}
