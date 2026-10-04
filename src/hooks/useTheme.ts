import { useEffect } from 'react';
import { useSettings } from './useData';

export function useThemeEffect(): void {
  const settings = useSettings();

  useEffect(() => {
    const isDark = settings.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch {
      // localStorage mungkin diblokir (mode private) — tidak masalah.
    }
  }, [settings.theme]);
}