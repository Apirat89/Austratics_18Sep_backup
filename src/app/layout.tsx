import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TelemetryProvider } from "@/components/TelemetryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Austratics",
    template: "%s | Austratics"
  },
  description: "Professional aged care analytics and insights platform for Australia",
  keywords: ["aged care", "analytics", "Australia", "healthcare", "data insights", "residential care", "home care"],
  authors: [{ name: "Austratics", url: "https://www.austratics.com" }],
  creator: "Austratics",
  publisher: "Austratics",
  metadataBase: new URL("https://www.austratics.com"),
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: "https://www.austratics.com",
    siteName: "Austratics",
    title: "Austratics - Aged Care Analytics Platform",
    description: "Professional aged care analytics and insights platform for Australia",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Austratics - Aged Care Analytics Platform" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Austratics - Aged Care Analytics Platform", 
    description: "Professional aged care analytics and insights platform for Australia",
    images: ["/og.png"]
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#1e3a8a" }
    ]
  },
  manifest: "/site.webmanifest"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <TelemetryProvider>
          <main className="flex-1">
            {children}
          </main>
          <footer className="bg-white border-t border-gray-100 py-4 mt-auto">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <p className="text-xs text-gray-500">
                © 2025 Austratics. All rights reserved.
              </p>
            </div>
          </footer>
        </TelemetryProvider>
        <div id="dropdown-root"></div>
      </body>
    </html>
  );
}
