import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Astalla Dashboard",
  description: "Operational insights dashboard for property teams"
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  const headerList = headers();
  const hostHeader = headerList.get("host") ?? "";
  const configuredMainHost = process.env.NEXT_PUBLIC_MAIN_HOST ?? "astalla.com";
  const host = hostHeader.split(":")[0];
  const mainHost = configuredMainHost.split(":")[0];
  const hostSegments = host.split(".");
  const mainHostSegments = mainHost.split(".");
  const isPublicHost =
    Boolean(mainHost) &&
    hostSegments.length > mainHostSegments.length &&
    host.endsWith(mainHost);

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-white font-sans text-slate-900 antialiased">
        <AppProviders>
          {isPublicHost ? (
            <main className="min-h-screen">{children}</main>
          ) : (
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex min-h-screen flex-1 flex-col bg-transparent">
                <Topbar />
                <main className="flex-1 min-h-0 p-6">
                  <div className="mx-auto flex max-w-6xl flex-col gap-6">{children}</div>
                </main>
              </div>
            </div>
          )}
        </AppProviders>
      </body>
    </html>
  );
}
