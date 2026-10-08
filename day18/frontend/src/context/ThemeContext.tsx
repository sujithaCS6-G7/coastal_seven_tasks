import React, { ReactNode } from 'react';
import { useThemeStore, ThemeMode } from '../store/useThemeStore';

export interface ThemeProviderProps {
  children: ReactNode;
}

export interface UseThemeReturn {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return <>{children}</>;
};

export const useTheme = (): UseThemeReturn => {
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
