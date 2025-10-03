import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { TableWorkspace } from "@/components/tables/table-workspace";
import { authOptions } from "@/lib/auth-options";

export default async function TablesIndexPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <TableWorkspace tableId="" />;
}
