import { PRODUCTS } from '../data/products';

const totalProducts = Object.keys(PRODUCTS).length;
const brands = new Set(Object.values(PRODUCTS).map(p => p.b)).size;

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-top">
        <div>MACROFORGE / CATÁLOGO 2026</div>
        <div>📍 SJ · CR</div>
      </div>
      <div className="hero-tag">✦ Salud · Performance · Bienestar</div>
      <h1>FORJA<br />TU <span className="ac">MEJOR</span><br />VERSIÓN.</h1>
      <p className="hero-sub">
        Más de {totalProducts} productos curados de suplementación deportiva,
        vitaminas y aromaterapia doTERRA — consultá por WhatsApp para disponibilidad y precios.
      </p>
      <div className="hero-stats">
        <div>
          <div className="hs-num">{totalProducts}</div>
          <div className="hs-lbl">Productos</div>
        </div>
        <div>
          <div className="hs-num">{brands}+</div>
          <div className="hs-lbl">Marcas</div>
        </div>
        <div>
          <div className="hs-num">3</div>
          <div className="hs-lbl">Ecosistemas</div>
        </div>
        <div>
          <div className="hs-num">📲</div>
          <div className="hs-lbl">WhatsApp 8443-6311</div>
        </div>
      </div>
    </section>
  );
}
