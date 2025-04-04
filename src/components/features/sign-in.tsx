"use client";

import React from "react";
import { Card } from "../ui/card";
import { DiscordButton } from "./discord-button";

export function SignIn() {
  return (
    <Card className="w-full max-w-sm p-6 mx-auto">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <DiscordButton />
      </div>
    </Card>
  );
}
