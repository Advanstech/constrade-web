import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "../index.css";
import { Providers } from "./Providers";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Constrade+",
  description: "Trade Ghana equities and fixed income with Constant Capital",
  applicationName: "Constrade+",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Constrade+",
    startupImage: [{ url: "/icons/icon-512.png" }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
