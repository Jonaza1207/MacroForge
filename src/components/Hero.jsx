import { PRODUCTS } from '../data/products';

const totalProducts = Object.keys(PRODUCTS).length;
const brands = new Set(Object.values(PRODUCTS).map(p => p.b)).size;

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-eyebrow">
        <span>MACROFORGE / CATÁLOGO 2026</span>
        <span>📍 SJ · CR</span>
      </div>
      <div className="hero-tag">✦ Salud · Performance · Bienestar</div>
      <h1>
        FORJA<br />
        TU <em>MEJOR</em><br />
        VERSIÓN.
      </h1>
      <p className="hero-sub">
        Más de {totalProducts} productos curados de suplementación deportiva,
        vitaminas y aromaterapia doTERRA — consultá por WhatsApp para disponibilidad y precios.
      </p>
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
          <div className="stat-lbl">Ecosistemas</div>
        </div>
        <div>
          <div className="stat-num">📲</div>
          <div className="stat-lbl">WhatsApp 8443-6311</div>
        </div>
      </div>
    </section>
  );
}
