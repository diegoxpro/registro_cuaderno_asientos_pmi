import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
    // El middleware de sesión ve el cuerpo de cada petición; por defecto lo corta a 10 MB.
    // Debe superar el máximo por subida de adjuntos (ver src/lib/attachmentRules.ts).
    middlewareClientMaxBodySize: "110mb",
  },
};

export default nextConfig;
