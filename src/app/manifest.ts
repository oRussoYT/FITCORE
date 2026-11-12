import type { MetadataRoute } from "next";

/** Faz o site virar app quando adicionado à tela de início. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "FITCORE AI",
    short_name: "FITCORE",
    description: "Treino, água e evolução do corpo — com IA que não inventa dados.",
    start_url: "/dashboard?origem=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d0f10",
    theme_color: "#0d0f10",
    lang: "pt-BR",
    categories: ["health", "fitness", "sports"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Treino de hoje", short_name: "Treinar", url: "/treinos", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Avaliação ao vivo", short_name: "Avaliar", url: "/evolucao/ao-vivo", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Minha evolução", short_name: "Evolução", url: "/evolucao", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
