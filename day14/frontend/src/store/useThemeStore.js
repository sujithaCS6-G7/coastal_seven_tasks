import { create } from 'zustand';

/**
 * Day 14: Zustand Theme Store
 * Manages Dark / Light mode with persistence and DOM synchronization.
 */
const getInitialTheme = () => {
  return localStorage.getItem('day14_theme') || localStorage.getItem('day13_theme') || 'light';
};

const applyThemeToDOM = (theme) => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const useThemeStore = create((set, get) => {
  const initialTheme = getInitialTheme();
  applyThemeToDOM(initialTheme);

  return {
    theme: initialTheme,
    get isDark() {
      return get().theme === 'dark';
    },
    toggleTheme: () => {
      const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
      applyThemeToDOM(nextTheme);
      localStorage.setItem('day14_theme', nextTheme);
      set({ theme: nextTheme });
    },
    setTheme: (newTheme) => {
      applyThemeToDOM(newTheme);
      localStorage.setItem('day14_theme', newTheme);
      set({ theme: newTheme });
    },
  };
});

export default useThemeStore;
