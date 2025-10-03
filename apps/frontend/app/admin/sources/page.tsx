import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { SourcesAdminView } from "./sources-view";
import { authOptions } from "@/lib/auth-options";

export default async function AdminSourcesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user?.role !== "admin") {
    redirect("/dashboard");
  }

  return <SourcesAdminView />;
}
