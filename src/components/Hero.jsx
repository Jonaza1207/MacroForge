import { PRODUCTS } from '../data/products';
import { WA_NUMBER } from '../data/catalog';

const totalProducts = Object.keys(PRODUCTS).length;
const brands = new Set(Object.values(PRODUCTS).map(p => p.b)).size;
const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hola MacroForge! 💪 Quiero ver el catálogo y consultar precios.')}`;

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

      {/* ── Main content ── */}
      <div className="hero-inner">
        <div className="hero-tag">Catálogo Oficial · 2026</div>

        <h1>
          FORJA TU<br />
          MEJOR <em>FÍSICO.</em>
        </h1>

        <p className="hero-sub">
          Suplementos 100% originales en Costa Rica — proteínas, creatinas,
          vitaminas y más. Pedí por WhatsApp, respuesta en minutos.
        </p>

        {/* ── CTAs ── */}
        <div className="hero-ctas">
          <a className="btn-primary" href="#sec-gym">Ver Catálogo →</a>
          <a className="btn-ghost" href={waUrl} target="_blank" rel="noopener noreferrer">
            💬 Pedir ahora
          </a>
        </div>

        {/* ── Stats ── */}
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

        {/* ── Section quick-nav ── */}
        <div className="hero-sections">
          <a className="hero-section-link hero-section-gym" href="#sec-gym">
            <span className="hero-section-icon">💪</span>
            <span className="hero-section-label">Gym</span>
            <span className="hero-section-sub">Performance</span>
          </a>
          <a className="hero-section-link hero-section-vita" href="#sec-vita">
            <span className="hero-section-icon">🌿</span>
            <span className="hero-section-label">Vitaminas</span>
            <span className="hero-section-sub">Salud</span>
          </a>
          <a className="hero-section-link hero-section-dote" href="#sec-dote">
            <span className="hero-section-icon">🌸</span>
            <span className="hero-section-label">doTERRA</span>
            <span className="hero-section-sub">Bienestar</span>
          </a>
        </div>
      </div>

    </section>
  );
}
