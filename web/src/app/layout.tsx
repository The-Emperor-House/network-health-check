import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IT Infrastructure Health",
  description: "Real-time network & system health monitoring dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-slate-50">
        <main className="p-4 md:p-8">{children}</main>
      </body>
    </html>
  );
}
