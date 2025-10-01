"use client";

import type { FormEvent } from "react";
import { useState } from "react";
 codex/fix-deployment-issue-on-vercel-6wxxpp
import Link from "next/link";

 codex/fix-deployment-issue-on-vercel-k6bm9d
import Link from "next/link";

 codex/fix-deployment-issue-on-vercel-rnbuxy
import Link from "next/link";

 main
 main
 main
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function LoginCard() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        identifier,
        password
      });

      if (result?.error) {
        setError("Invalid credentials. Please try again.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (_error) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border bg-card p-10 text-left shadow-sm">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Sign in to continue</h1>
        <p className="text-sm text-muted-foreground">
 codex/fix-deployment-issue-on-vercel-6wxxpp
          Use your Astalla email or username with your password to access the dashboard.

 codex/fix-deployment-issue-on-vercel-k6bm9d
          Use your Astalla email or username with your password to access the dashboard.

 codex/fix-deployment-issue-on-vercel-rnbuxy
          Use your Astalla email or username with your password to access the dashboard.

          Use your Astalla email or username with the shared password to access the dashboard.
 main
 main
 main
        </p>
      </div>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="identifier">
            Email or username
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            required
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert" aria-live="polite">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || identifier.trim() === "" || password.trim() === ""}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
 codex/fix-deployment-issue-on-vercel-6wxxpp

 codex/fix-deployment-issue-on-vercel-k6bm9d

 codex/fix-deployment-issue-on-vercel-rnbuxy
 main
 main
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Need an account?{" "}
        <Link className="font-medium text-primary hover:underline" href="/register">
          Create one
        </Link>
      </p>
 codex/fix-deployment-issue-on-vercel-6wxxpp

 codex/fix-deployment-issue-on-vercel-k6bm9d


 main
 main
 main
    </div>
  );
}
