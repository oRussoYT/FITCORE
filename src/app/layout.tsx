import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { brand } from "@/config/brand";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s · ${brand.shortName}` },
  description: brand.description,
};

export const viewport: Viewport = {
  themeColor: "#0d0f10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={archivo.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
