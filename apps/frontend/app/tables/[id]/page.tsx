import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { TableWorkspace } from "@/components/tables/table-workspace";
import { authOptions } from "@/lib/auth-options";

interface TablePageProps {
  params: {
    id: string;
  };
}

export default async function TablePage({ params }: TablePageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <TableWorkspace tableId={params.id} />;
}
