import type { Metadata } from "next";
import "./globals.css";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import ThemeRegistry from "@/components/ThemeRegistry";

export const metadata: Metadata = {
  title: "IT Infrastructure Health",
  description: "Real-time network & system health monitoring dashboard",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>
        <AppRouterCacheProvider>
          <ThemeRegistry>
            <main style={{ minHeight: "100vh", padding: "24px 16px" }}>
              {children}
            </main>
          </ThemeRegistry>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
