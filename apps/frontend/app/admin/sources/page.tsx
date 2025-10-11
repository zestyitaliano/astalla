import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { SourcesAdminView } from "./sources-view";
import { authOptions } from "@/lib/auth-options";

export default async function AdminSourcesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  if (session.user?.role !== "ORG_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="card-surface rounded-2xl border bg-white/90 p-6 shadow-card">
        <SourcesAdminView />
      </div>
    </div>
  );
}
