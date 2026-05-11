import { lazy, Suspense } from 'react';
import { PRODUCTS } from '../data/products';
import GoalNav from './GoalNav';

// All lazy — zero cost to first contentful paint.
const ReactivationCenter = lazy(() => import('./ReactivationCenter'));
const RefillSection      = lazy(() => import('./RefillSection'));
const RecentlyViewed     = lazy(() => import('./RecentlyViewed'));
const FavoritesList      = lazy(() => import('./FavoritesList'));
const EditorialSection   = lazy(() => import('./EditorialSection'));
const FeaturedProducts   = lazy(() => import('./FeaturedProducts'));

const SECTION_META = {
  gym: {
    icon:    '💪',
    tagline: 'Performance',
    desc:    'Proteínas, creatinas, pre-entrenos y todo para tu entrenamiento.',
  },
  vita: {
    icon:    '🌿',
    tagline: 'Salud',
    desc:    'Vitaminas, minerales, magnesio y suplementos para tu bienestar.',
  },
  dote: {
    icon:    '🌸',
    tagline: 'Bienestar',
    desc:    'Aceites esenciales y productos naturales doTERRA originales.',
  },
};

export default function CatalogHome({ sections, sectionCounts, onSelectSection, onOpenProduct, onGoal }) {
  return (
    <div className="catalog-home">

      {/* Reactivation Center — Phase 7: journey status + abandoned recovery + VIP + refill signals.
          Renders only for returning users with behavioral history.
          New visitors see nothing here — the page stays clean. */}
      <Suspense fallback={null}>
        <ReactivationCenter />
      </Suspense>

      {/* Refill reminder — detailed refill candidates for purchase-history users */}
      {onOpenProduct && (
        <Suspense fallback={null}>
          <RefillSection onOpenProduct={onOpenProduct} />
        </Suspense>
      )}

      {/* Personal history — highest relevance for returning visitors */}
      {onOpenProduct && (
        <Suspense fallback={null}>
          <RecentlyViewed onOpenProduct={onOpenProduct} />
        </Suspense>
      )}

      {/* Saved products — high purchase intent */}
      {onOpenProduct && (
        <Suspense fallback={null}>
          <FavoritesList onOpenProduct={onOpenProduct} />
        </Suspense>
      )}

      {/* Editorial groups — for new/exploring visitors with no personal history */}
      {onOpenProduct && (
        <Suspense fallback={null}>
          <EditorialSection onOpenProduct={onOpenProduct} />
        </Suspense>
      )}

      {/* Store-curated featured products — always shown */}
      {onOpenProduct && (
        <Suspense fallback={null}>
          <FeaturedProducts onOpenProduct={onOpenProduct} />
        </Suspense>
      )}

      {/* Goal-based navigation — 1-tap path to the right category */}
      {onGoal && <GoalNav onNavigate={onGoal} />}

      <div className="catalog-home-intro">
        <div className="catalog-home-eyebrow">Explorar por categoría</div>
        <h2 className="catalog-home-title">¿Qué estás buscando?</h2>
        <p className="catalog-home-sub">
          {Object.keys(PRODUCTS).length} productos originales — Gym, Vitaminas y doTERRA.
        </p>
      </div>

      <div className="section-cards">
        {Object.entries(sections).map(([id, section]) => {
          const meta  = SECTION_META[id] || {};
          const count = sectionCounts[id] || 0;
          return (
            <button
              key={id}
              className="section-card"
              style={{ '--sc': section.color }}
              onClick={() => onSelectSection(id)}
              aria-label={`Explorar ${section.label}`}
            >
              <div className="section-card-top">
                <span className="section-card-icon">{meta.icon}</span>
                <span className="section-card-tag" style={{ color: section.color }}>
                  {meta.tagline}
                </span>
              </div>
              <div className="section-card-label">{section.label}</div>
              <div className="section-card-desc">{meta.desc}</div>
              <div className="section-card-footer">
                <span className="section-card-count">{count} productos</span>
                <span className="section-card-cta" style={{ color: section.color }}>
                  Ver productos →
                </span>
              </div>
              <div
                className="section-card-accent"
                style={{ background: section.color }}
              />
            </button>
          );
        })}
      </div>

    </div>
  );
}
