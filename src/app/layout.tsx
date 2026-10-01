import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./pwa.css";

export const metadata: Metadata = {
  title: "Empire City — Premium Board Game",
  description: "Build your empire, own the city. A premium mobile-first property-trading board game. Solo vs bots, local network and online multiplayer.",
  keywords: ["board game", "property trading", "Empire City", "multiplayer", "PWA"],
  applicationName: "Empire City",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Empire City",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#E4572E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
