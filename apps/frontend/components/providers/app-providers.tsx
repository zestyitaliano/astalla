'use client';

import { ReactNode, useEffect, useMemo } from 'react';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const mockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

export function Providers({ children }: { children: ReactNode }) {
  const client = useMemo(() => new QueryClient(), []);

  useEffect(() => {
    if (mockMode) {
      import('../../mocks/browser').then(({ worker }) => {
        worker.start({ onUnhandledRequest: 'bypass' });
      });
    }
  }, []);

  return (
    <SessionProvider>
      <QueryClientProvider client={client}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
        {mockMode ? <div className="mock-indicator">Mocked</div> : null}
      </QueryClientProvider>
    </SessionProvider>
  );
}
