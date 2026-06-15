import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Story of Greatness — FIFA World Cup 2026",
  description: "Follow the tournament through the lens of greatness. Legacy scores, match narratives, and performer spotlights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
