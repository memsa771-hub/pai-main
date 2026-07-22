import type { Metadata } from "next";
import "./globals.css";

import { AppProvider } from "@/context/AppContext";
import { AppProviders } from "@/providers/app-providers";

export const metadata: Metadata = {
  title: "Placement AI - AI Admissions Companion",
  description:
    "Your AI companion to easy admissions to your desired university.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('placement-ai-theme') || 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <AppProvider>
          <AppProviders>{children}</AppProviders>
        </AppProvider>
      </body>
    </html>
  );
}