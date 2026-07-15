import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SIGERM",
  description:
    "Sistema Integral de Gestión para Encuentros de Renovación Matrimonial",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${roboto.className} min-h-screen bg-slate-100`}
      >
        {children}

        <Toaster
          position="top-right"
          richColors
          expand
          closeButton
          duration={3000}
        />
      </body>
    </html>
  );
}