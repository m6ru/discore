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
  // Home-screen app on iPhone: the page draws under the status bar (white clock);
  // the forest strip in the body keeps the clock readable on every page.
  appleWebApp: { statusBarStyle: "black-translucent" },
};

/** Forest status bar everywhere: browser chrome via theme-color, home-screen app via the strip. */
export const viewport: Viewport = {
  themeColor: "#1d3a2c",
  viewportFit: "cover",
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
      <body className="flex min-h-full flex-col pt-[env(safe-area-inset-top)]">
        {/* Status bar strip: zero height in a browser tab, the clock's height in the home-screen app. */}
        <div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-[env(safe-area-inset-top)] bg-primary" />
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
