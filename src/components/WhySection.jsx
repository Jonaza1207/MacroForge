const WHY_ITEMS = [
  {
    icon: '✅',
    title: 'Productos 100% Originales',
    desc: 'Solo marcas verificadas. Cada producto viene directo del proveedor oficial.',
  },
  {
    icon: '💬',
    title: 'Atención por WhatsApp',
    desc: 'Asesoría directa, personalizada y sin compromiso. Confirmamos disponibilidad con el proveedor.',
  },
  {
    icon: '🎯',
    title: 'Catálogo Curado',
    desc: 'Selección de productos pensada para resultados reales y calidad comprobada.',
  },
  {
    icon: '🚀',
    title: 'Envíos en Costa Rica',
    desc: 'Entrega directa en todo el país. Rápido, seguro y sin complicaciones.',
  },
];

export default function WhySection() {
  return (
    <section className="why-section">
      <div className="why-inner">
        <div className="why-header">
          <div className="why-eyebrow">Nuestra promesa</div>
          <h2 className="why-title">¿Por qué comprar en MacroForge?</h2>
        </div>
        <div className="why-grid">
          {WHY_ITEMS.map((item) => (
            <div key={item.title} className="why-card">
              <div className="why-card-icon" aria-hidden="true">{item.icon}</div>
              <div className="why-card-title">{item.title}</div>
              <div className="why-card-desc">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
