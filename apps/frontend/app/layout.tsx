import './globals.css';
import { ReactNode } from 'react';
import { Providers } from '../components/providers';
import { Inter } from 'next/font/google';
import { Footer } from '../components/footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? 'Astalla Control',
  description: 'Astalla Control marketing operations dashboard'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <header className="border-b bg-white">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm uppercase tracking-wide text-slate-500">Astalla Control</p>
                  <h1 className="text-xl font-semibold text-slate-900">Marketing Ops Command</h1>
                </div>
                <div>
                  <span className="rounded-full bg-primary px-4 py-1 text-sm font-medium text-white">
                    Beta
                  </span>
                </div>
              </div>
            </header>
            <main className="flex-1 bg-slate-50">
              <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">{children}</div>
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
