import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function initialTheme(): boolean {
  try {
    const stored = localStorage.getItem('hmgu-theme');
    if (stored === 'dark' || stored === 'light') return stored === 'dark';
  } catch { /* El tema funciona aunque el navegador no permita almacenamiento. */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function ThemeSwitch() {
  const [dark, setDark] = useState(initialTheme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    try { localStorage.setItem('hmgu-theme', dark ? 'dark' : 'light'); } catch { /* Sin persistencia. */ }
  }, [dark]);
  return <button type="button" className="theme-switch" onClick={() => setDark(!dark)} aria-label={dark ? 'Activar tema claro' : 'Activar tema oscuro'} aria-pressed={dark}>
    {dark ? <Sun size={17} /> : <Moon size={17} />}<span>{dark ? 'Tema claro' : 'Tema oscuro'}</span>
  </button>;
}
