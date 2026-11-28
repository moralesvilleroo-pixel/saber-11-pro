import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Saber11 Pro",
    short_name: "Saber11",
    description: "Preparación para el Saber 11 con repaso espaciado y simulacros.",
    start_url: "/inicio",
    display: "standalone",
    background_color: "#f7f8fb",
    theme_color: "#1f4fa8",
    lang: "es-CO",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
