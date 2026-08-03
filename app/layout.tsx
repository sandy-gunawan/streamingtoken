import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Streaming vs Non-Streaming — RAG Demo",
  description:
    "Watch token streaming and non-streaming answer the same question, side by side, " +
    "grounded by Azure AI Search.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>
        <div className="bg-grid" aria-hidden />
        <div className="bg-noise" aria-hidden />
        {children}
      </body>
    </html>
  );
}
