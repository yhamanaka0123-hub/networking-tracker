import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Networking Tracker",
  description: "Track your professional contacts, securely.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
