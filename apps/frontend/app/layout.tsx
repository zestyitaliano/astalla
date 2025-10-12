import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { AppChrome } from "@/components/shell/app-chrome";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-base",
  display: "swap"
});

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
      <body className="min-h-screen bg-background font-sans text-foreground antialiased transition-colors">
        <AppProviders>
          {isPublicHost ? (
            <main className="min-h-screen">
              <div className="mx-auto min-h-screen w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">{children}</div>
            </main>
          ) : (
            <AppChrome>{children}</AppChrome>
          )}
        </AppProviders>
      </body>
    </html>
  );
}
