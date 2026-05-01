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

      {/* ── Headline ── */}
      <div className="hero-inner">
        <div className="hero-tag">Catálogo Oficial · 2026</div>

        <h1>
          FORJA<br />
          TU <em>MEJOR</em><br />
          VERSIÓN.
        </h1>

        <p className="hero-sub">
          Más de {totalProducts} productos de suplementación deportiva, vitaminas
          y bienestar. Consultá disponibilidad directamente por WhatsApp —
          respuesta en minutos.
        </p>

        {/* ── CTAs ── */}
        <div className="hero-ctas">
          <a className="btn-primary" href="#sec-gym">
            Ver Catálogo →
          </a>
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
            <div className="stat-lbl">WhatsApp Directo</div>
          </div>
        </div>

        {/* ── Trust strip ── */}
        <div className="hero-trust">
          <span className="hero-trust-item">Marcas 100% Originales</span>
          <span className="hero-trust-item">Envío en Costa Rica</span>
          <span className="hero-trust-item">+3 Años en el Mercado</span>
          <span className="hero-trust-item">Respuesta Inmediata</span>
        </div>
      </div>

    </section>
  );
}
