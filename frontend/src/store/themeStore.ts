import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  initializeTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDarkMode: false,

      toggleTheme: () => {
        const newValue = !get().isDarkMode;
        set({ isDarkMode: newValue });
        if (newValue) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      setTheme: (isDark: boolean) => {
        set({ isDarkMode: isDark });
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      initializeTheme: () => {
        const stored = localStorage.getItem('theme-store');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.state && typeof parsed.state.isDarkMode === 'boolean') {
              set({ isDarkMode: parsed.state.isDarkMode });
              if (parsed.state.isDarkMode) {
                document.documentElement.classList.add('dark');
              }
              return;
            }
          } catch {
            console.error('Failed to parse theme from localStorage');
          }
        }
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        set({ isDarkMode: prefersDark });
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        }
      },
    }),
    {
      name: 'theme-store',
    }
  )
);

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  const stored = localStorage.getItem('theme-store');
  if (!stored) {
    const newValue = e.matches;
    const store = useThemeStore.getState();
    if (store.isDarkMode !== newValue) {
      store.setTheme(newValue);
    }
  }
});
