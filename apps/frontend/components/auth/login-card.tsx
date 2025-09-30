'use client';

import { signIn } from 'next-auth/react';
import { Button } from '../ui/button';
import { useState } from 'react';

export function LoginCard() {
  const [email, setEmail] = useState('demo@astalla.com');

  return (
    <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
      <h1 className="text-2xl font-semibold text-slate-50">Sign in to Astalla Control</h1>
      <p className="mt-2 text-sm text-slate-400">Google SSO in production. Use mock login to explore.</p>
      <div className="mt-6 space-y-4">
        <Button className="w-full" variant="secondary" onClick={() => signIn('google', { callbackUrl: '/dashboard' })}>
          Continue with Google
        </Button>
        <div className="text-center text-xs uppercase tracking-wide text-slate-500">or</div>
        <input
          className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@company.com"
        />
        <Button className="w-full" onClick={() => signIn('credentials', { email, callbackUrl: '/dashboard' })}>
          Use mock account
        </Button>
      </div>
    </div>
  );
}
