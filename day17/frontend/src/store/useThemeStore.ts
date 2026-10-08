import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

export interface ThemeState {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (newTheme: ThemeMode) => void;
}

const getInitialTheme = (): ThemeMode => {
  const saved =
    localStorage.getItem('day16_theme') ||
    localStorage.getItem('day15_theme') ||
    localStorage.getItem('day14_theme');
  return saved === 'dark' ? 'dark' : 'light';
};

const applyThemeToDOM = (theme: ThemeMode): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialTheme = getInitialTheme();
  applyThemeToDOM(initialTheme);

  return {
    theme: initialTheme,
    toggleTheme: () => {
      const nextTheme: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
      applyThemeToDOM(nextTheme);
      localStorage.setItem('day16_theme', nextTheme);
      set({ theme: nextTheme });
    },
    setTheme: (newTheme: ThemeMode) => {
      applyThemeToDOM(newTheme);
      localStorage.setItem('day16_theme', newTheme);
      set({ theme: newTheme });
    },
  };
});

export default useThemeStore;
