"use client";

import { signIn } from "next-auth/react";
import { DiscIcon as Discord } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";

export function DiscordButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await signIn("discord", { callbackUrl: "/dashboard" });
    } catch (error) {
      console.error("Authentication error:", error);
    }
  };

  return (
    <Button
      onClick={handleSignIn}
      disabled={isLoading}
      className="rounded-md flex items-center gap-2 px-6 py-5 bg-[#5865F2] hover:bg-[#4752c4] text-white"
    >
      {isLoading ? (
        <Spinner className="h-5 w-5" />
      ) : (
        <Discord className="h-5 w-5" />
      )}
      <span className="font-medium">
        {isLoading ? "Connecting..." : "Sign in with Discord"}
      </span>
    </Button>
  );
}
