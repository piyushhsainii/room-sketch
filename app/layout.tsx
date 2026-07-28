import type { Metadata } from "next";
// @ts-ignore
import "./globals.css"
import { APP } from "@/constants/content";
import { Analytics } from "@vercel/analytics/next";

// Set NEXT_PUBLIC_SITE_URL in .env(.local) / your host's env settings,
// e.g. https://roomsketch.com — used to build absolute URLs for OG/Twitter
// images and the canonical link.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://roomsketch.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: APP.name,
    template: `%s · ${APP.name}`,
  },
  description: APP.description,
  keywords: [
    "floor plan software",
    "3D floor plan",
    "room sketch",
    "home design tool",
    "walkthrough 3D",
    "interior design planner",
    "floor plan to 3D",
  ],
  authors: [{ name: APP.name }],
  creator: APP.name,
  publisher: APP.name,
  alternates: {
    canonical: "/room-sketch-hero.jpeg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: APP.name,
    title: APP.name,
    description: APP.description,
    locale: "en_US",
    images: [
      {
        url: "/room-sketch-hero.jpeg",
        width: 1200,
        height: 630,
        alt: `${APP.name} — sketch a floor plan, walk it in 3D`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP.name,
    description: APP.description,
    images: ["/og-image.png"],
    // creator: "@roomsketch", // add your handle if you have one
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/room-sketch-logo.jpg",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: APP.name,
    description: APP.description,
    url: siteUrl,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <html lang="en">
      <body className="antialiased">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
      <Analytics />
    </html>
  );
}