import { useMemo } from 'react';
import logo from '../assets/Branding/macroforge-logo-icon.png';
import { PRODUCTS } from '../data/products';
import { buildWaUrl } from '../lib/whatsapp';
import { getCustomerState } from '../lib/customerState';

const totalProducts = Object.keys(PRODUCTS).length;
const brands = new Set(Object.values(PRODUCTS).map(p => p.b)).size;

// Returning-visitor recognition copy — subtle, premium, not invasive.
// Goal: the customer feels recognized without knowing they're being recognized.
const RETURN_SUBTITLES = {
  exploring: 'Tus favoritos y productos vistos están esperándote.',
  returning: 'Continuá donde lo dejaste.',
  regular:   'Bienvenido de vuelta.',
  loyal:     'Tu espacio. Tus suplementos.',
};

export default function Hero({ onNavigate }) {
  const waUrl = buildWaUrl('welcome');

  // Pure read — no side effects, computed once on mount
  const returnSubtitle = useMemo(() => {
    const state = getCustomerState();
    return state.isReturning ? (RETURN_SUBTITLES[state.segment] || null) : null;
  }, []);

  return (
    <section className="hero">

      {/* ── Top bar ── */}
      <div className="hero-topbar">
        <div className="hero-logo">MACRO<span>FORGE</span></div>
        <div className="hero-topbar-right">
          <span className="hero-location">📍 San José, CR</span>
          <a className="hero-wa-pill" href={waUrl} target="_blank" rel="noopener noreferrer">
            💬 +506 6111-8315
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

          {/* Recognition subtitle for returning visitors — or default for new */}
          {returnSubtitle ? (
            <p className="hero-sub hero-sub--returning">
              {returnSubtitle}
            </p>
          ) : (
            <p className="hero-sub">
              Suplementos originales para mejorar tu rendimiento,
              ganar masa y alcanzar tu mejor físico.
              Disponibles en Costa Rica — pedí por WhatsApp.
            </p>
          )}

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
              <div className="stat-num stat-num--pct">100%</div>
              <div className="stat-lbl">Originales</div>
            </div>
          </div>

          {/* Category quick navigation */}
          <div className="hero-sections">
            <button
              className="hero-section-indicator hero-section-gym"
              type="button"
              onClick={() => onNavigate('gym')}
              aria-label="Explorar Gym"
            >
              <span className="hero-section-icon">💪</span>
              <span className="hero-section-label">Gym</span>
              <span className="hero-section-sub">Proteína, fuerza y rendimiento diario</span>
            </button>
            <button
              className="hero-section-indicator hero-section-vita"
              type="button"
              onClick={() => onNavigate('vita')}
              aria-label="Explorar Vitaminas"
            >
              <span className="hero-section-icon">🌿</span>
              <span className="hero-section-label">Vitaminas</span>
              <span className="hero-section-sub">Energía, salud y bienestar esencial</span>
            </button>
            <button
              className="hero-section-indicator hero-section-dote"
              type="button"
              onClick={() => onNavigate('dote')}
              aria-label="Explorar doTERRA"
            >
              <span className="hero-section-icon">🌸</span>
              <span className="hero-section-label">doTERRA</span>
              <span className="hero-section-sub">Aceites esenciales 100% originales</span>
            </button>
          </div>
        </div>

        {/* RIGHT: Brand logo */}
        <div className="hero-right">
          <div className="hero-logo-wrap">
            <div className="hero-logo-glow" aria-hidden="true" />
            <div className="hero-logo-spark hero-logo-spark--a" aria-hidden="true" />
            <div className="hero-logo-spark hero-logo-spark--b" aria-hidden="true" />
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
