import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions, isMockMode } from '../../../lib/auth';
import { WeeklyReportView } from '../../../components/reports/weekly-report-view';

export default async function WeeklyReportPage() {
  if (!isMockMode) {
    const session = await getServerSession(authOptions);
    if (!session) {
      redirect('/');
    }
  }

  return <WeeklyReportView />;
}
