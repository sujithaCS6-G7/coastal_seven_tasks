import React from 'react';
import { useThemeStore } from '../store/useThemeStore';

/**
 * Day 14: ThemeProvider & useTheme Hook powered by Zustand (useThemeStore)
 */
export const ThemeProvider = ({ children }) => {
  return <>{children}</>;
};

export const useTheme = () => {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
  };
};

export default useThemeStore;
