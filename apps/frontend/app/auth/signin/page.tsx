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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary/40 p-6">
      <LoginCard />
    </div>
  );
}
