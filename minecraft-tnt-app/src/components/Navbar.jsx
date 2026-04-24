import { useState } from 'react';

export default function Navbar({ theme, onThemeToggle }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <span className="navbar-logo">💥 TNT Guide</span>

      <ul className={`navbar-links${menuOpen ? ' open' : ''}`}>
        <li><a href="#inicio" onClick={closeMenu}>Inicio</a></li>
        <li><a href="#crafteo" onClick={closeMenu}>Crafteo</a></li>
        <li><a href="#mecanica" onClick={closeMenu}>Mecánica</a></li>
        <li><a href="#usos" onClick={closeMenu}>Usos</a></li>
        <li><a href="#advertencias" onClick={closeMenu}>Advertencias</a></li>
      </ul>

      <div className="navbar-actions">
        <button className="theme-toggle" onClick={onThemeToggle} title="Cambiar tema">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button
          className={`hamburger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menú"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
}
