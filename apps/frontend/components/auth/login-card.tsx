"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function LoginCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");

    if (!errorParam) {
      return;
    }

    if (errorParam === "CredentialsSignin") {
      setError("Invalid email or password. Please try again.");
      return;
    }

    setError("Unable to sign in. Please try again.");
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        identifier: identifier.trim(),
        password
      });

      if (!result) {
        console.error("[auth] signIn returned null result");
        setError("Unable to sign in. Please try again.");
        return;
      }

      if (result.error) {
        console.error("[auth] signIn returned error", result.error);
        if (result.error === "CredentialsSignin") {
          setError("Invalid email or password. Please try again.");
        } else {
          setError(result.error);
        }
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (caughtError) {
      console.error("[auth] signIn threw an exception", caughtError);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses =
    "flex h-11 w-full rounded-lg border border-border/70 bg-card px-3 py-2 text-sm text-foreground shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-border/70 bg-card/95 p-10 text-left shadow-xl backdrop-blur">
      <div className="space-y-2 text-center">
        <h1 className="font-heading text-3xl uppercase tracking-[0.28em] text-foreground">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Use your Astalla email or username with the shared password to access the dashboard.
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
            className={inputClasses}
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
            className={inputClasses}
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
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Need an account?{" "}
        <Link className="font-medium text-brand-secondary hover:text-brand-secondary/80 hover:underline" href="/register">
          Create one
        </Link>
      </p>
    </div>
  );
}
