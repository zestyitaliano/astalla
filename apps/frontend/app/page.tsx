import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions, isMockMode } from '../lib/auth';

export default async function HomePage() {
  if (isMockMode) {
    return (
      <div className="mx-auto max-w-lg rounded-lg bg-white p-8 shadow">
        <h2 className="text-2xl font-semibold text-slate-900">Mock mode</h2>
        <p className="mt-2 text-sm text-slate-600">You're running Astalla Control in mock mode. Jump straight to the dashboard.</p>
        <Link className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-white" href="/dashboard">
          Enter dashboard
        </Link>
      </div>
    );
  }

  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="mx-auto max-w-lg rounded-lg bg-white p-8 shadow">
        <h2 className="text-2xl font-semibold text-slate-900">Welcome to Astalla Control</h2>
        <p className="mt-2 text-sm text-slate-600">
          Sign in with your Google account to access your marketing operations command center.
        </p>
        <Link
          className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-white"
          href="/api/auth/signin"
        >
          Continue with Google
        </Link>
      </div>
    );
  }

  redirect('/dashboard');
}
