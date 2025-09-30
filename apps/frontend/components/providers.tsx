'use client';

import { ReactNode, useEffect, useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockFlag = process.env.NEXT_PUBLIC_MOCK_MODE ?? process.env.MOCK_MODE ?? 'true';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());

  useEffect(() => {
    if (mockFlag === 'true' && typeof window !== 'undefined') {
      import('../mocks/browser')
        .then(({ worker }) => worker.start())
        .catch((err) => console.error('Failed to start MSW', err));
    }
  }, []);

  return (
    <SessionProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}
