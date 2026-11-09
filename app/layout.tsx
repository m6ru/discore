import type { Metadata, Viewport } from "next";
import { Manrope, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { AppChrome } from "@/components/layout/app-chrome";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

/** Headings and big numbers (`font-display`). */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Discore",
  description: "Discore disc golf score tracking app.",
  manifest: "/manifest.webmanifest",
};

/** Phone status bar / browser chrome: the light ground; `/` overrides it with the forest band. */
export const viewport: Viewport = {
  themeColor: "#fafaf6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AppChrome>{children}</AppChrome>
        <Toaster
          position="bottom-center"
          theme="light"
          offset="calc(4.5rem + env(safe-area-inset-bottom, 0px))"
        />
      </body>
    </html>
  );
}
