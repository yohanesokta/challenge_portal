import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
  title: {
    default: "Coding Assignment Portal",
    template: "%s | Coding Assignment Portal",
  },
  description: "A platform for solving daily coding challenges and improving your programming skills.",
  keywords: ["coding", "programming", "challenges", "assignment", "developer"],
  authors: [{ name: "Coding Assignment Team" }],
  creator: "Coding Assignment Team",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: "Coding Assignment Portal",
    title: "Coding Assignment Portal",
    description: "Selesaikan tantangan pemrograman harian dan asah kemampuan coding Anda.",
    images: [
      {
        url: "/next.svg", // Fallback image
        width: 800,
        height: 600,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Coding Assignment Portal",
    description: "Selesaikan tantangan pemrograman harian dan asah kemampuan coding Anda.",
    images: ["/next.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

import { AuthProvider } from "./components/providers/AuthProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${spaceGrotesk.variable} dark antialiased`}
    >
      <head>
        <meta name="google-site-verification" content="7KrI9NvgMVFbAi_bY9GNQQlN7er_05Lz9O1CTYyXOVE" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full font-body-main text-on-surface custom-scrollbar overflow-x-hidden bg-[#1e1e1e]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

