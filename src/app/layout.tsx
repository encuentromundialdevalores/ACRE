import type { Metadata } from "next";
import { Inter, Schibsted_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const display = Schibsted_Grotesk({ subsets: ["latin"], weight: ["600", "700", "800", "900"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "ACRE · Gestión Territorial",
  description: "Registra terrenos del Área Metropolitana de Monterrey, consulta fuentes oficiales y comparte su expediente.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${display.variable} ${mono.variable}`}>
      <body className="font-sans"><ToastProvider><ConfirmProvider>{children}</ConfirmProvider></ToastProvider></body>
    </html>
  );
}
