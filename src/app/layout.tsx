import type { Metadata } from "next";
import "./globals.css";
import CleanStorageInitializer from "@/components/CleanStorageInitializer";

export const metadata: Metadata = {
  title: "Cuaderno de Incidencias Digital — GORE Lambayeque (Obras por Impuestos)",
  description: "Plataforma institucional del Gobierno Regional de Lambayeque para la gestión de proyectos de inversión Ley N° 29230 y registro digital de asientos de obra con carácter de declaración jurada.",
  keywords: ["GORE Lambayeque", "Cuaderno de Incidencias", "Obras por Impuestos", "Ley 29230", "Asientos de Obra", "Residente", "Supervisor"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#F9F9F9] text-[#1A1C1C] antialiased">
        <CleanStorageInitializer />
        {children}
      </body>
    </html>
  );
}
