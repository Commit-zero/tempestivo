import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// Uma família só, servida pelo próprio app. O eixo de largura dá os títulos largos e os
// números estreitos da contagem.
const archivo = Archivo({ variable: "--font-sans", subsets: ["latin"], axes: ["wdth"] });

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
    { media: "(prefers-color-scheme: light)", color: "#f4f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1424" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
