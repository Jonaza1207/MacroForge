/**
 * FavoritesList — "Mis favoritos"
 *
 * Shows products the user has saved via the heart button in the modal.
 * Renders nothing if no favorites exist.
 *
 * Placement: below RecentlyViewed, above FeaturedProducts.
 * Psychology: saved products represent the highest purchase intent —
 * a user who bookmarked something intends to buy it.
 * Surfacing their favorites on return eliminates re-discovery friction.
 *
 * Updates reactively via custom event when favorites are toggled.
 */
import { useFavorites } from '../hooks/useFavorites';
import { PRODUCTS } from '../data/products';
import { analytics } from '../lib/analytics';
import { buildWaUrl } from '../lib/whatsapp';
import ProductCard from './ProductCard';

export default function FavoritesList({ onOpenProduct }) {
  const { favs } = useFavorites();
  const ids = [...favs].filter(id => PRODUCTS[id]);

  if (ids.length === 0) return null;

  const waUrl = buildWaUrl('favoritesConsult', { count: ids.length });

  function handleConsult() {
    analytics.favoritesConsult(ids.length);
    analytics.whatsappClick('favorites_consult', null, `${ids.length} favoritos`);
  }

  return (
    <section className="favorites-section">
      <div className="favorites-header">
        <div>
          <div className="favorites-eyebrow">Guardados por vos</div>
          <h3 className="favorites-title">
            Mis favoritos
            <span className="favorites-count">{ids.length}</span>
          </h3>
        </div>
        <a
          className="favorites-consult"
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Consultar mis favoritos por WhatsApp"
          onClick={handleConsult}
        >
          💬 Consultar todos
        </a>
      </div>
      <div className="product-grid">
        {ids.map(id => (
          <ProductCard
            key={id}
            product={PRODUCTS[id]}
            onClick={() => onOpenProduct(id)}
          />
        ))}
      </div>
    </section>
  );
}
