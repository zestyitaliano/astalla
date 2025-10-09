"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/utils";
import { registerBasicAuthResponseSchema } from "@shared/api";

const isMockMode =
  process.env.DEV_MOCKS === "true" || process.env.NEXT_PUBLIC_DEV_MOCKS === "true";

function toErrorMessage(input: unknown): string {
  if (!input) {
    return "Unable to create an account. Please try again.";
  }

  if (typeof input === "string") {
    return input;
  }

  if (Array.isArray(input)) {
    return input.join(" \u2022 ");
  }

  if (typeof input === "object" && "message" in input) {
    return toErrorMessage((input as { message?: unknown }).message);
  }

  return "Unable to create an account. Please try again.";
}

export function RegisterCard() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [orgName, setOrgName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isMockMode) {
        const result = await signIn("credentials", {
          redirect: false,
          identifier: email,
          password
        });

        if (result?.error) {
          setError("Unable to sign in with the provided credentials.");
          return;
        }

        router.replace("/dashboard");
        router.refresh();
        return;
      }

      const response = await fetch(`${apiBaseUrl}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password,
          name: name.trim() || undefined,
          username: username.trim() || undefined,
          orgName: orgName.trim() || undefined
        })
      });

      if (!response.ok) {
        let message: unknown = undefined;
        try {
          const json = await response.json();
          message = json?.message ?? json;
        } catch (_error) {
          message = undefined;
        }
        setError(toErrorMessage(message));
        return;
      }

      const payload = registerBasicAuthResponseSchema.parse(await response.json());

      const result = await signIn("credentials", {
        redirect: false,
        identifier: payload.email,
        password
      });

      if (result?.error) {
        setError("Account created, but automatic sign-in failed. Please try logging in.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (caughtError) {
      console.error("Failed to register", caughtError);
      setError("Unable to create an account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled =
    isSubmitting ||
    email.trim() === "" ||
    password.length < 8 ||
    password !== confirmPassword;

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border bg-card p-10 text-left shadow-sm">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Enter your details to set up an Astalla account.
        </p>
      </div>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="username">
            Username <span className="text-xs text-muted-foreground">(optional)</span>
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <p className="text-xs text-muted-foreground">
            Use 3-32 characters: letters, numbers, dots, underscores, or hyphens.
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="orgName">
            Organization name <span className="text-xs text-muted-foreground">(optional)</span>
          </label>
          <input
            id="orgName"
            name="orgName"
            type="text"
            autoComplete="organization"
            value={orgName}
            onChange={(event) => setOrgName(event.target.value)}
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
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <p className="text-xs text-muted-foreground">Use at least 8 characters for security.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert" aria-live="polite">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="font-medium text-primary hover:underline" href="/auth/signin">
          Sign in
        </Link>
      </p>
    </div>
  );
}
