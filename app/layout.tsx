import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trustchain — Web3 Project Transparency",
  description:
    "Evidence-backed transparency and monitoring for Web3 projects.",
  applicationName: "Trustchain"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}