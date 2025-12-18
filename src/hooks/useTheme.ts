import { useState, useEffect } from 'react';

interface ThemeHook {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    setTheme: (theme: 'light' | 'dark') => void;
}

export function useTheme(): ThemeHook {
    const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
        // Check localStorage first
        const stored = localStorage.getItem('theme');
        if (stored === 'light' || stored === 'dark') {
            return stored;
        }
        // Check system preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    useEffect(() => {
        // Apply theme to document
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setThemeState(prev => prev === 'light' ? 'dark' : 'light');
    };

    const setTheme = (newTheme: 'light' | 'dark') => {
        setThemeState(newTheme);
    };

    return { theme, toggleTheme, setTheme };
}
