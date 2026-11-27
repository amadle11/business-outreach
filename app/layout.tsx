import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

export const metadata = { title: "Anthony Builds" };
export const viewport = { width: "device-width", initialScale: 1, themeColor: "#0c0c0e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
