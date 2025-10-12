import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { TablesWorkspace } from "@/app/tables/tables-workspace";
import { authOptions } from "@/lib/auth-options";

export default async function AdminTablesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  if (session.user?.role !== "ORG_ADMIN") {
    redirect("/dashboard");
  }

  return <TablesWorkspace canManage />;
}
