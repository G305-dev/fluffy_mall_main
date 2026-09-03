import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";

// @ts-ignore - Next.js processes global CSS imports at build time.
import "./globals.css";

import { CartProvider } from "@/components/CartProvider";
import Header from "@/components/Header";
import StoreFooter from "@/components/StoreFooter";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import Reveal from "@/components/Reveal";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://fluffynyummy.com"),

  title: {
    default: "Fluffy'n'Yummy Mall | Home, Kitchen & Gifting — Lagos",
    template: "%s | Fluffy'n'Yummy Mall",
  },

  description:
    "Shop household, kitchen and gifting essentials from Fluffy'n'Yummy Mall, Anthony Village, Lagos. Nationwide delivery, Paystack checkout, bank transfer and WhatsApp ordering.",

  icons: {
    icon: "/images/fm%20logo.png",
    shortcut: "/images/fm%20logo.png",
    apple: "/images/fm%20logo.png",
  },

  openGraph: {
    title: "Fluffy'n'Yummy Mall",
    description:
      "Your one-stop store for everything home, kitchen & gifting. Nationwide delivery from Lagos.",
    url: "https://fluffynyummy.com",
    siteName: "Fluffy'n'Yummy Mall",
    images: [
      {
        url: "/images/hero.jpg",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_NG",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Fluffy'n'Yummy Mall",
    images: ["/images/hero.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-NG">
      <body
        className={`${fraunces.variable} ${outfit.variable} font-sans antialiased`}
      >
        <CartProvider>
          <Header />

          <main className="min-h-[70vh]">{children}</main>

          <StoreFooter />
          <WhatsAppFloat />

          {/* Current CSS scroll-reveal animation */}
          <Reveal />
        </CartProvider>
      </body>
    </html>
  );
}