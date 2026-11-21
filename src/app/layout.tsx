import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Serifada só na marca e nos títulos principais: o tom do mundo jurídico, sem pesar a interface.
const sourceSerif = Source_Serif_4({
  variable: "--font-serif-marca",
  subsets: ["latin"],
  weight: ["600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRICAO = "A agenda de prazos do advogado autônomo: calcula, explica, cobra a conferência e avisa antes que seja tarde.";

export const metadata: Metadata = {
  // Base das URLs absolutas da imagem de compartilhamento; o build não precisa dela.
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: { default: "Tempestivo: nunca perca um prazo", template: "%s · Tempestivo" },
  description: DESCRICAO,
  applicationName: "Tempestivo",
  openGraph: { type: "website", locale: "pt_BR", siteName: "Tempestivo", title: "Tempestivo: nunca perca um prazo", description: DESCRICAO },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1521" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
