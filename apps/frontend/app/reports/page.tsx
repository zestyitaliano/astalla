import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { ReportsView } from "@/components/reports/reports-view";
import { authOptions } from "@/lib/auth-options";

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  if (session.user?.role !== "ORG_ADMIN") {
    redirect("/dashboard");
  }

  return <ReportsView />;
}
