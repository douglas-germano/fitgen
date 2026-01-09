"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

type Theme = "light" | "dark";

type ThemeContextType = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("dark");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Initialize Capacitor Status Bar
        if (Capacitor.isNativePlatform()) {
            const initStatusBar = async () => {
                try {
                    await StatusBar.setOverlaysWebView({ overlay: true });
                    await StatusBar.setStyle({ style: Style.Dark });
                } catch (error) {
                    console.error("Failed to configure status bar:", error);
                }
            };
            initStatusBar();
        }

        // Load theme from localStorage
        const savedTheme = localStorage.getItem("theme") as Theme | null;
        if (savedTheme) {
            setThemeState(savedTheme);
            document.documentElement.classList.toggle("dark", savedTheme === "dark");
            updateStatusBarStyle(savedTheme);
        } else {
            // Default to dark mode
            setThemeState("dark");
            document.documentElement.classList.add("dark");
            updateStatusBarStyle("dark");
        }
    }, []);

    const updateStatusBarStyle = async (newTheme: Theme) => {
        if (Capacitor.isNativePlatform()) {
            try {
                await StatusBar.setStyle({
                    style: newTheme === 'dark' ? Style.Dark : Style.Light
                });
            } catch (error) {
                console.error("Failed to update status bar style:", error);
            }
        }
    };

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
        updateStatusBarStyle(newTheme);
    };

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    // Prevent flash of unstyled content
    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
