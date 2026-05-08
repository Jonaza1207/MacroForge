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
import { WA_NUMBER } from '../data/catalog';
import { useFavorites } from '../hooks/useFavorites';
import { PRODUCTS } from '../data/products';
import ProductCard from './ProductCard';

export default function FavoritesList({ onOpenProduct }) {
  const { favs } = useFavorites();
  const ids = [...favs].filter(id => PRODUCTS[id]);

  if (ids.length === 0) return null;

  const waMsg = `Hola MacroForge! 💪 Tengo varios productos guardados en mis favoritos y quiero consultarlos. ¿Me pueden ayudar con precios y disponibilidad?`;
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMsg)}`;

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
