import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import "@fontsource-variable/plus-jakarta-sans";
import "@/app/globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/lib/theme";
import QueryProvider from "@/providers/QueryProvider";

export const Route = createRootRoute({
    head: () => ({
        meta: [
            { charSet: "utf-8" },
            { title: "FitGen Admin" },
            { name: "description", content: "Painel administrativo do FitGen." },
            { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" },
            { name: "theme-color", content: "#a1ec03" },
            { name: "robots", content: "noindex, nofollow" },
            { name: "apple-mobile-web-app-capable", content: "yes" },
            { name: "apple-mobile-web-app-status-bar-style", content: "default" },
            { name: "apple-mobile-web-app-title", content: "FitGen" },
        ],
        links: [
            { rel: "icon", href: "/favicon.ico" },
            { rel: "apple-touch-icon", href: "/apple-icon.png" },
            { rel: "manifest", href: "/manifest.json" },
        ],
    }),
    notFoundComponent: () => (
        <main className="mx-auto max-w-lg space-y-3 p-8">
            <h1 className="text-xl font-bold">Página não encontrada</h1>
            <Link to="/admin" className="text-volt-ink underline">Voltar ao painel</Link>
        </main>
    ),
    component: Root,
    shellComponent: Document,
});

function Root() {
    useEffect(() => {
        if (import.meta.env.PROD && "serviceWorker" in navigator) {
            navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
                console.warn("Falha ao registrar o service worker do FitGen Admin.", error);
            });
        }
    }, []);

    return (
        <ThemeProvider>
            <QueryProvider>
                <Outlet />
                <Toaster />
            </QueryProvider>
        </ThemeProvider>
    );
}

function Document({ children }: { children: ReactNode }) {
    return (
        <html lang="pt-BR" suppressHydrationWarning>
            <head><HeadContent /></head>
            <body className="antialiased [--font-jakarta:'Plus_Jakarta_Sans_Variable']" suppressHydrationWarning>
                {children}
                <Scripts />
            </body>
        </html>
    );
}
