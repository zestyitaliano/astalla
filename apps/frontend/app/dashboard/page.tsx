import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions, isMockMode } from '../../lib/auth';
import { DashboardShell } from '../../components/dashboard/dashboard-shell';

export default async function DashboardPage() {
  if (!isMockMode) {
    const session = await getServerSession(authOptions);
    if (!session) {
      redirect('/');
    }
  }

  return <DashboardShell />;
}
