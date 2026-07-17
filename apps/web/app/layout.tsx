import type { Metadata } from "next";
import { AppChrome } from "@/components/app-chrome";
import { ThemeProvider } from "@/components/theme-provider";
import { platformBrand } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: platformBrand.name,
  description: platformBrand.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Material Symbols does not currently have a Next.js font-loader export. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=award_star,close,collapse_content,copy_all,dashboard,date_range,delete,edit,expand_content,filter_alt,group,open_in_new,playing_cards,push_pin,search,shield_lock,sports,summarize&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <AppChrome>{children}</AppChrome>
        </ThemeProvider>
      </body>
    </html>
  );
}
