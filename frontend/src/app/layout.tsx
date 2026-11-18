import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  themeColor: "#a1ec03",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

// The same code is published twice (see scripts/prune-export.mjs): the sales page (lp.fitgen.pro)
// and the admin panel (admin.fitgen.pro, an installable PWA).
const isLanding = process.env.NEXT_PUBLIC_SITE === "lp";

export const metadata: Metadata = isLanding
  ? {
      title: "FitGen — Treino e dieta personalizados com IA",
      description: "O FitGen cria um plano de treino adequado ao seu nível, objetivos e tempo disponível e ajusta a progressão conforme você evolui.",
    }
  : {
      title: "FitGen Admin",
      description: "Painel administrativo do FitGen.",
      manifest: "/manifest.json",
      robots: { index: false, follow: false },
      appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "FitGen",
      },
    };

import { Toaster } from "@/components/ui/sonner";
import QueryProvider from "@/providers/QueryProvider";
import { ThemeProvider } from "@/lib/theme";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${jakarta.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
