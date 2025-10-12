import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { LoginCard } from "@/components/auth/login-card";
import { authOptions } from "@/lib/auth-options";

export default async function SignInPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-6"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_120%_at_0%_0%,hsl(var(--accent)_/_0.22)_0%,transparent_55%),radial-gradient(140%_120%_at_100%_0%,hsl(var(--primary)_/_0.18)_0%,transparent_55%),linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--bg))_85%,transparent_100%)] dark:bg-[radial-gradient(140%_140%_at_20%_-10%,hsl(var(--accent)_/_0.18)_0%,transparent_55%),linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--bg))_80%,transparent_100%)]" />
      <LoginCard />
    </div>
  );
}
