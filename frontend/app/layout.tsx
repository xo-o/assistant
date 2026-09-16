import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luis - Asesor Automotriz Virtual | Google ADK & Gen AI SDK",
  description: "Asistente y asesor conversacional automotriz con Google ADK, Zod, Human-in-the-Loop y OpenTelemetry",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full bg-background text-foreground antialiased selection:bg-blue-500/20">
        {children}
      </body>
    </html>
  );
}
