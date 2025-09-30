import './globals.css';
import { ReactNode } from 'react';
import { Providers } from '../components/providers/app-providers';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Astalla Control',
  description: 'Marketing ops dashboard for multifamily teams.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
