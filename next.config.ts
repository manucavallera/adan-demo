import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" arma un servidor chico para el Dockerfile (deploy en Easypanel).
  output: "standalone",
  // La carga rápida manda hasta 4 fotos achicadas a la IA por una server action.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
};

export default nextConfig;
