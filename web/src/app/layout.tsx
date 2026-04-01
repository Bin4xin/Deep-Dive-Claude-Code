import type { Metadata } from "next";
import { LocaleProvider } from "@/lib/locale-context";
import { Header } from "@/components/layout/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deep Dive Claude Code",
  description: "Understand a production-grade AI coding assistant through 13 progressive chapters",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <LocaleProvider>
          <Header />
          <main>{children}</main>
        </LocaleProvider>
      </body>
    </html>
  );
}
