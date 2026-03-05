import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { themeOptions } from '@/components/profile/ThemeSelector';
import { useAuth } from '@/lib/AuthContext';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState('default');
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const { isAuthenticated, isLoadingAuth } = useAuth();

  // Detect and apply system dark mode preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyColorScheme = (isDark) => {
      setDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyColorScheme(mediaQuery.matches);

    const handler = (e) => applyColorScheme(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      loadUserTheme();
    } else if (!isLoadingAuth) {
      setIsLoading(false);
    }
  }, [isLoadingAuth, isAuthenticated]);

  const loadUserTheme = async () => {
    try {
      const user = await base44.auth.me();
      if (user?.data?.theme) {
        setCurrentTheme(user.data.theme);
        applyTheme(user.data.theme);
      }
    } catch (error) {
      // User not logged in or error loading theme
    } finally {
      setIsLoading(false);
    }
  };

  const applyTheme = (themeId) => {
    const theme = themeOptions.find(t => t.id === themeId) || themeOptions[0];
    
    // Apply theme as data attribute for CSS targeting
    document.documentElement.setAttribute('data-theme', themeId);
    
    // Also apply as CSS variables for custom styling
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-highlight', theme.colors.highlight);
  };

  const updateTheme = async (themeId) => {
    try {
      await base44.auth.updateMe({ theme: themeId });
      setCurrentTheme(themeId);
      applyTheme(themeId);
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, updateTheme, isLoading, darkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}