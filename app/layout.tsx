import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://vargvox.com"),
  title: "VargVox — sounds for the Stark Varg",
  description:
    "Community-designed audible ride-mode feedback for the Stark Varg. Design, hear and share mode sounds.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "VargVox — sounds for the Stark Varg",
    description:
      "Community-designed audible ride-mode feedback for the Stark Varg. Design, hear and share mode sounds.",
    url: "/",
    siteName: "VargVox",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
