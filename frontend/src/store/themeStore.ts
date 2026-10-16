import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface ThemeState {
    theme: Theme;
    toggle: () => void;
    setTheme: (theme: Theme) => void;
}

/**
 * Theme preference is the one thing allowed in localStorage
 * (the access token is memory-only — spec §9.3).
 */
export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'light',
            toggle: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
            setTheme: (theme) => set({ theme }),
        }),
        { name: 'careercampus-theme' },
    ),
);

export function applyTheme(theme: Theme): void {
    document.documentElement.classList.toggle('dark', theme === 'dark');
}
