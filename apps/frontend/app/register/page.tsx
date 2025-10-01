import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { RegisterCard } from "@/components/auth/register-card";
import { authOptions } from "@/lib/auth-options";

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary/40 p-6">
      <RegisterCard />
    </div>
  );
}
