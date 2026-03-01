import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env["NEXT_PUBLIC_APP_URL"] || "https://ebizmate.com"),
  title: {
    default: "EbizMate — The Autonomous Sales Team for Modern E-Business",
    template: "%s | EbizMate",
  },
  description: "Give your brand a front-line AI Sales Rep and a back-office AI Coach. EbizMate handles Instagram and TikTok comments, DMs, and sales 24/7 with a Zero-Hallucination Pipeline.",
  keywords: ["AI Customer Service", "TikTok Auto Reply", "Instagram DM Automation", "Visual Commerce", "AI Agent for E-commerce", "SaaS"],
  authors: [{ name: "EbizMate Inc." }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ebizmate.com",
    title: "EbizMate — The Autonomous Sales Team for Modern E-Business",
    description: "Give your brand a front-line AI Sales Rep and a back-office AI Coach. EbizMate handles Instagram and TikTok comments, DMs, and sales 24/7.",
    siteName: "EbizMate",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "EbizMate — Turn Every DM Into Revenue",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EbizMate — Multichannel AI Sales Reps",
    description: "Stop dropping leads in DMs. Deploy EbizMate to auto-reply to comments, fetch products, and close sales perfectly aligned with your brand voice.",
    creator: "@ebizmate",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Providers />
      </body>
    </html>
  );
}

