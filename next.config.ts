import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" arma un servidor chico para el Dockerfile (deploy en Easypanel).
  output: "standalone",
};

export default nextConfig;
