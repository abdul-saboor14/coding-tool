
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reverse Studio | AI Inspiration-to-App Builder",
  description:
    "Turn design inspiration into original React websites with AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
