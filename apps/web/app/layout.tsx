import type { Metadata } from "next";
import { headers } from "next/headers";
import { AppChrome } from "@/components/app-chrome";
import { CookieNotice } from "@/components/cookie-notice";
import { ThemeProvider } from "@/components/theme-provider";
import { platformBrand } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: platformBrand.name,
  description: platformBrand.description,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Keep the server-owned UX flag reversible at process restart without rebuilding.
  await headers();
  const uxV2 = process.env.OPENFORGE_FUND_MANAGER_UX_V2 === "true";
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Material Symbols does not currently have a Next.js font-loader export. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <AppChrome uxV2={uxV2}>{children}</AppChrome>
          <CookieNotice />
        </ThemeProvider>
      </body>
    </html>
  );
}
