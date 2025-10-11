import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { SourceStudioView } from "./studio-view";
import { authOptions } from "@/lib/auth-options";

interface SourceStudioPageProps {
  params: { id: string };
}

export default async function SourceStudioPage({ params }: SourceStudioPageProps) {
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
        <SourceStudioView sourceId={params.id} />
      </div>
    </div>
  );
}
