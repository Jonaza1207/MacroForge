import { useState, useMemo, useCallback } from 'react';
import { PRODUCTS } from './data/products';
import { SECTIONS } from './data/catalog';
import { useTheme } from './hooks/useTheme';
import Hero from './components/Hero';
import Controls from './components/Controls';
import CatalogSection from './components/CatalogSection';
import ProductModal from './components/ProductModal';
import WhatsAppFloat from './components/WhatsAppFloat';

function buildSearchStr(p) {
  return [p.n, p.b, p.c, ...(p.f || [])].join(' ').toLowerCase();
}

export default function App() {
  const { theme, toggle } = useTheme();

  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery]   = useState('');
  const [openProductId, setOpenProductId] = useState(null);

  const handleFilter = useCallback(f  => setActiveFilter(f),    []);
  const handleSearch = useCallback(q  => setSearchQuery(q),     []);
  const handleOpen   = useCallback(id => setOpenProductId(id),  []);
  const handleClose  = useCallback(()  => setOpenProductId(null), []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return Object.entries(PRODUCTS).filter(([, p]) => {
      if (activeFilter !== 'all' && p.s !== activeFilter) return false;
      if (!q) return true;
      return buildSearchStr(p).includes(q);
    });
  }, [activeFilter, searchQuery]);

  const grouped = useMemo(() => {
    const result = {};
    for (const [id, p] of filtered) {
      if (!result[p.s])       result[p.s] = {};
      if (!result[p.s][p.c]) result[p.s][p.c] = [];
      result[p.s][p.c].push([id, p]);
    }
    return result;
  }, [filtered]);

  return (
    <>
      <Hero />

      {/* Trust bar */}
      <div className="trust-bar">
        <div className="trust-bar-item">
          <span className="trust-bar-icon">🚀</span>
          <div className="trust-bar-text">
            <span className="trust-bar-label">Envíos en Costa Rica</span>
            <span className="trust-bar-sub">Entrega rápida</span>
          </div>
        </div>
        <div className="trust-bar-item">
          <span className="trust-bar-icon">✅</span>
          <div className="trust-bar-text">
            <span className="trust-bar-label">Marcas 100% Originales</span>
            <span className="trust-bar-sub">Garantía de autenticidad</span>
          </div>
        </div>
        <div className="trust-bar-item">
          <span className="trust-bar-icon">💬</span>
          <div className="trust-bar-text">
            <span className="trust-bar-label">Atención por WhatsApp</span>
            <span className="trust-bar-sub">Respuesta en minutos</span>
          </div>
        </div>
        <div className="trust-bar-item">
          <span className="trust-bar-icon">⭐</span>
          <div className="trust-bar-text">
            <span className="trust-bar-label">+500 Clientes Satisfechos</span>
            <span className="trust-bar-sub">+3 años en el mercado</span>
          </div>
        </div>
      </div>

      <div className="tip">
        <b>Mejor experiencia:</b> Si abriste esto desde WhatsApp, tocá <b>Compartir</b> y elegí{' '}
        <b>Abrir en Chrome/Safari</b> para ver el catálogo completo.
      </div>

      <Controls
        activeFilter={activeFilter}
        searchQuery={searchQuery}
        visibleCount={filtered.length}
        onFilter={handleFilter}
        onSearch={handleSearch}
        theme={theme}
        onThemeToggle={toggle}
      />

      {Object.entries(SECTIONS).map(([sectionId, sectionData]) => {
        if (activeFilter !== 'all' && activeFilter !== sectionId) return null;
        return (
          <CatalogSection
            key={sectionId}
            sectionId={sectionId}
            sectionData={sectionData}
            productsByCategory={grouped[sectionId] || {}}
            onOpenProduct={handleOpen}
          />
        );
      })}

      {filtered.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">Sin resultados</div>
          <div className="empty-sub">Probá con otro término o limpiá el filtro.</div>
        </div>
      )}

      <footer className="footer">
        <div className="footer-brand">MACRO<span>FORGE</span></div>
        <div className="footer-meta">
          <div>Catálogo 2026 · SJ, CR</div>
          <div>Todos los precios +IVA</div>
          <div><em>✦ Salud · Performance · Bienestar ✦</em></div>
        </div>
      </footer>

      {openProductId && (
        <ProductModal productId={openProductId} onClose={handleClose} />
      )}

      <WhatsAppFloat />
    </>
  );
}
