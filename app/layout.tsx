import type { Metadata } from "next";
import { Inter, Playfair_Display, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Suspense } from 'react';
import Navbar from './components/navbar';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Tech Interview AI",
  description: "Nền tảng luyện phỏng vấn kỹ thuật cùng AI",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${playfair.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><Suspense fallback={<div className="h-16 bg-[#090909]" />}><Navbar /></Suspense>{children}</body>
    </html>
  );
}
