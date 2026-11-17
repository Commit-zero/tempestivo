import type { MetadataRoute } from "next";

// Manifesto do app: atalho na tela inicial do celular, abrindo direto no painel.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tempestivo: prazos e honorários",
    short_name: "Tempestivo",
    description: "A agenda de prazos do advogado autônomo.",
    lang: "pt-BR",
    start_url: "/painel",
    scope: "/",
    display: "standalone",
    background_color: "#fbfaf7",
    theme_color: "#123260",
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/icone-mascaravel-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
