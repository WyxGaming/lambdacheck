import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "LambdaCheck — angle lambda photographique",
  description:
    "Mesure photographique de l’angle lambda. AP-HP, Hôpital Necker-Enfants malades, OPHTARA, Université Paris Cité, Centre Borelli. Les photos restent locales.",
  applicationName: "LambdaCheck",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "LambdaCheck",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#860b34",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
