import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Footy Tips", template: "%s · Footy Tips" },
  description: "Rugby league tipping with friends, family and everyone else.",
  icons: { icon: "/icon.svg" },
  appleWebApp: { capable: true, title: "Footy Tips", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1014" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
