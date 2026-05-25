import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chords Warmup",
  description: "Practice chord progressions generated from a reproducible seed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
