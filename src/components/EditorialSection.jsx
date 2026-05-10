/**
 * EditorialSection — Curated product collections for the home screen.
 *
 * These feel editorial, not algorithmic. Each group is a genuine
 * recommendation from MacroForge — like a knowledgeable friend saying:
 * "If I were you, I'd start with these."
 *
 * Renders ONE group at a time, chosen based on customer segment.
 * Not shown if the user already has favorites or recently viewed products
 * of their own (personalized content takes precedence).
 *
 * Psychology: for a new visitor who hasn't built their own history,
 * editorial guidance reduces overwhelm and increases purchase confidence.
 */
import { useMemo } from 'react';
import { PRODUCTS } from '../data/products';
import { analytics } from '../lib/analytics';
import { buildWaUrl } from '../lib/whatsapp';
import { getEditorialGroupsForSegment } from '../data/editorialGroups';
import { getCustomerState } from '../lib/customerState';
import ProductCard from './ProductCard';

// slug → product ID map (module-level, computed once)
const SLUG_TO_ID = (() => {
  const m = {};
  for (const [id, p] of Object.entries(PRODUCTS)) {
    const slug = p.u?.match(/\/tienda\/([^/?#]+)/)?.[1];
    if (slug) m[slug] = id;
  }
  return m;
})();

export default function EditorialSection({ onOpenProduct }) {
  const groups = useMemo(() => {
    const state = getCustomerState();

    // Don't show editorial if the user already has personal history —
    // RecentlyViewed and FavoritesList provide better personalized content.
    if (state.hasFavorites || state.hasRecentlyViewed) return [];

    return getEditorialGroupsForSegment(state.segment);
  }, []);

  if (groups.length === 0) return null;

  return (
    <>
      {groups.map(group => {
        const ids = group.slugs
          .map(slug => SLUG_TO_ID[slug])
          .filter(id => id && PRODUCTS[id]);

        if (ids.length < 2) return null;

        const waUrl = buildWaUrl(group.waFlow, { goal: group.waGoal });

        return (
          <section key={group.id} className="editorial-section">
            <div className="editorial-header">
              <div className="editorial-eyebrow">{group.eyebrow}</div>
              <h2 className="editorial-title">{group.title}</h2>
              {group.subtitle && (
                <p className="editorial-subtitle">{group.subtitle}</p>
              )}
            </div>

            <div className="product-grid">
              {ids.map(id => (
                <ProductCard
                  key={id}
                  product={PRODUCTS[id]}
                  onClick={() => {
                    analytics.featuredClick(id, PRODUCTS[id]?.n, group.id);
                    onOpenProduct(id);
                  }}
                />
              ))}
            </div>

            <div className="editorial-footer">
              <a
                className="editorial-consult"
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  analytics.stackCTA(group.id, group.title);
                  analytics.whatsappClick('editorial', group.id, group.title);
                }}
              >
                💬 Asesoría para este objetivo →
              </a>
            </div>
          </section>
        );
      })}
    </>
  );
}
