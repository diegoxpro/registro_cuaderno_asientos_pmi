import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Permite compilar en otra carpeta mientras la app sigue en servicio (ver scripts/deploy.sh)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      {
        // Todas las API responden JSON, excepto la descarga de adjuntos (sirve el tipo real del archivo)
        source: "/api/:path((?!attachments/).*)",
        headers: [
          { key: "Content-Type", value: "application/json; charset=utf-8" },
        ],
      },
    ];
  },
  experimental: {
    // Límite del cuerpo que ve el middleware de sesión (por defecto 10 MB). La subida de adjuntos
    // (/api/attachments) está excluida del middleware y verifica la sesión en la propia ruta.
    middlewareClientMaxBodySize: "110mb",
  },
};

export default nextConfig;
