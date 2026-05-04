import { useState, useEffect } from 'react';

function resolveInitial() {
  try {
    const saved = localStorage.getItem('mf-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  } catch {}
  return 'dark';
}

export function useTheme() {
  const [theme, setTheme] = useState(resolveInitial);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    // Brief transition class so switch feels smooth, not applied permanently
    root.classList.add('theme-switching');
    const t = setTimeout(() => root.classList.remove('theme-switching'), 380);

    try { localStorage.setItem('mf-theme', theme); } catch {}
    return () => clearTimeout(t);
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggle };
}
