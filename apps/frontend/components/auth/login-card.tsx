"use client";

import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function LoginCard() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center space-y-6 rounded-2xl border bg-card p-10 text-center shadow-sm">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Sign in to continue</h1>
        <p className="text-sm text-muted-foreground">
          Authenticate with Google to access your Astalla dashboards.
        </p>
      </div>
      <Button className="w-full" onClick={() => signIn("google")}>Sign in with Google</Button>
    </div>
  );
}
