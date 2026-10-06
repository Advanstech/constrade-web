import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Constant Capital — Constrade+",
    short_name: "Constrade+",
    description:
      "Trade Ghana Stock Exchange equities and government fixed income with Constant Capital — secure, regulated, built for Ghanaian investors.",
    lang: "en",
    dir: "ltr",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "browser"],
    orientation: "portrait-primary",
    background_color: "#0B132B",
    theme_color: "#0B132B",
    categories: ["finance", "business"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    shortcuts: [
      {
        name: "Trade",
        short_name: "Trade",
        description: "Place an equity or fixed-income order",
        url: "/app/trade",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Portfolio",
        short_name: "Portfolio",
        description: "View holdings and performance",
        url: "/app/portfolio",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Markets",
        short_name: "Markets",
        description: "GSE prices and market data",
        url: "/app/markets",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Wallet",
        short_name: "Wallet",
        description: "Fund your account or withdraw",
        url: "/app/funding",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
