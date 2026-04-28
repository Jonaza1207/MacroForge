import { useState, useMemo, useCallback } from 'react';
import { PRODUCTS } from './data/products';
import { SECTIONS } from './data/catalog';
import Hero from './components/Hero';
import Controls from './components/Controls';
import CatalogSection from './components/CatalogSection';
import ProductModal from './components/ProductModal';
import WhatsAppFloat from './components/WhatsAppFloat';

function buildSearchStr(p) {
  return [p.n, p.b, p.c, ...(p.f || [])].join(' ').toLowerCase();
}

export default function App() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openProductId, setOpenProductId] = useState(null);

  const handleFilter = useCallback(f => setActiveFilter(f), []);
  const handleSearch = useCallback(q => setSearchQuery(q), []);
  const handleOpen = useCallback(id => setOpenProductId(id), []);
  const handleClose = useCallback(() => setOpenProductId(null), []);

  // Filter products
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return Object.entries(PRODUCTS).filter(([, p]) => {
      if (activeFilter !== 'all' && p.s !== activeFilter) return false;
      if (!q) return true;
      return buildSearchStr(p).includes(q);
    });
  }, [activeFilter, searchQuery]);

  // Group filtered products by section > category
  const grouped = useMemo(() => {
    const result = {};
    for (const [id, p] of filtered) {
      if (!result[p.s]) result[p.s] = {};
      if (!result[p.s][p.c]) result[p.s][p.c] = [];
      result[p.s][p.c].push([id, p]);
    }
    return result;
  }, [filtered]);

  const visibleCount = filtered.length;

  return (
    <>
      <Hero />

      <div className="tip">
        💡 <b>Mejor experiencia:</b> Si abriste esto desde WhatsApp, tocá <b>Compartir</b> y elegí{' '}
        <b>Abrir en Chrome/Safari</b> para verlo completo.
      </div>

      <Controls
        activeFilter={activeFilter}
        searchQuery={searchQuery}
        visibleCount={visibleCount}
        onFilter={handleFilter}
        onSearch={handleSearch}
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

      {visibleCount === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: '#8a8a84' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Sin resultados</div>
          <div style={{ fontSize: 14 }}>Probá con otro término o limpié el filtro.</div>
        </div>
      )}

      <footer>
        <div className="f-brand">MACRO<span>FORGE</span></div>
        <div className="f-info">
          <div>Catálogo 2026 · SJ, CR</div>
          <div>Todos los precios +IVA</div>
          <div style={{ color: '#c8ff00' }}>✦ Salud · Performance · Bienestar ✦</div>
        </div>
      </footer>

      {openProductId && (
        <ProductModal productId={openProductId} onClose={handleClose} />
      )}

      <WhatsAppFloat />
    </>
  );
}
