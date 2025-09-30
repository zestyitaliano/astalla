'use client';

import { useEffect, useState } from 'react';

export function Footer() {
  const [mock, setMock] = useState('true');

  useEffect(() => {
    setMock((process.env.NEXT_PUBLIC_MOCK_MODE ?? process.env.MOCK_MODE ?? 'true').toString());
  }, []);

  return (
    <footer className="border-t bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 text-sm text-slate-500">
        <span>© {new Date().getFullYear()} Astalla</span>
        <span className="font-medium">
          Mode: <strong>{mock === 'true' ? 'Mocked' : 'Live'}</strong>
        </span>
      </div>
    </footer>
  );
}
