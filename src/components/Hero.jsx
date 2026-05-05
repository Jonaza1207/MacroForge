import logo from '../assets/Branding/macroforge-logo-icon.png';
import { PRODUCTS } from '../data/products';
import { WA_NUMBER } from '../data/catalog';

const totalProducts = Object.keys(PRODUCTS).length;
const brands = new Set(Object.values(PRODUCTS).map(p => p.b)).size;
const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hola MacroForge! 💪 Quiero consultar el catálogo de suplementos.')}`;

export default function Hero() {
  return (
    <section className="hero">

      {/* ── Top bar ── */}
      <div className="hero-topbar">
        <div className="hero-logo">MACRO<span>FORGE</span></div>
        <div className="hero-topbar-right">
          <span className="hero-location">📍 San José, CR</span>
          <a className="hero-wa-pill" href={waUrl} target="_blank" rel="noopener noreferrer">
            💬 8443-6311
          </a>
        </div>
      </div>

      {/* ── 2-column layout ── */}
      <div className="hero-inner">

        {/* LEFT: Content */}
        <div className="hero-left">
          <div className="hero-tag">Catálogo Oficial · 2026</div>

          <h1>
            FORJA TU<br />
            MEJOR <em>FÍSICO.</em>
          </h1>

          <p className="hero-sub">
            Suplementos originales para mejorar tu rendimiento,
            ganar masa y alcanzar tu mejor físico.
            Disponibles en Costa Rica — pedí por WhatsApp.
          </p>

          {/* Primary CTA */}
          <div className="hero-cta-wrap">
            <a className="btn-consultar" href={waUrl} target="_blank" rel="noopener noreferrer">
              💬&nbsp; Consultar por WhatsApp
            </a>
          </div>

          {/* Stats */}
          <div className="hero-stats">
            <div>
              <div className="stat-num">{totalProducts}</div>
              <div className="stat-lbl">Productos</div>
            </div>
            <div>
              <div className="stat-num">{brands}+</div>
              <div className="stat-lbl">Marcas</div>
            </div>
            <div>
              <div className="stat-num">3</div>
              <div className="stat-lbl">Líneas</div>
            </div>
            <div>
              <div className="stat-num">📲</div>
              <div className="stat-lbl">WhatsApp</div>
            </div>
          </div>

          {/* Category indicators — visual only, NOT interactive */}
          <div className="hero-sections">
            <div className="hero-section-indicator hero-section-gym">
              <span className="hero-section-icon">💪</span>
              <span className="hero-section-label">Gym</span>
              <span className="hero-section-sub">Performance</span>
            </div>
            <div className="hero-section-indicator hero-section-vita">
              <span className="hero-section-icon">🌿</span>
              <span className="hero-section-label">Vitaminas</span>
              <span className="hero-section-sub">Salud</span>
            </div>
            <div className="hero-section-indicator hero-section-dote">
              <span className="hero-section-icon">🌸</span>
              <span className="hero-section-label">doTERRA</span>
              <span className="hero-section-sub">Bienestar</span>
            </div>
          </div>
        </div>

        {/* RIGHT: Brand logo */}
        <div className="hero-right">
          <div className="hero-logo-wrap">
            {/* Ambient glow — behind the logo */}
            <div className="hero-logo-glow" aria-hidden="true" />
            {/* Micro energy sparks */}
            <div className="hero-logo-spark hero-logo-spark--a" aria-hidden="true" />
            <div className="hero-logo-spark hero-logo-spark--b" aria-hidden="true" />
            {/* Stage clips the metallic shine sweep */}
            <div className="hero-logo-stage">
              <img
                src={logo}
                alt="MacroForge"
                className="hero-logo-img"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        </div>

      </div>

    </section>
  );
}
