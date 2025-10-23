import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/modules/auth/AuthContext";

const excalifont = localFont({
  src: [
    {
      path: "../public/fonts/Excalifont-Regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-excalifont",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Anyn0te",
  description: "Share and explore anonymous notes in a simple, modern feed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" rel="stylesheet" />
      </head>
      <body
        className={`${excalifont.variable} ${excalifont.className} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
