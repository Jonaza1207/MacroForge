import { useEffect, useRef } from 'react';

const WARNINGS = [
  {
    icon: '⚠️',
    title: 'Cerca de tu base',
    desc: 'Nunca actives TNT cerca de tus construcciones. Un error puede destruir horas de trabajo en segundos.',
  },
  {
    icon: '🚫',
    title: 'Servidores sin permisos',
    desc: 'Muchos servidores multijugador prohíben el TNT. Usar explosivos sin permiso puede resultar en ban.',
  },
  {
    icon: '📦',
    title: 'Cerca de cofres',
    desc: 'Las explosiones destruyen los objetos que sueltan los cofres. Aleja tu almacenamiento de los explosivos.',
  },
  {
    icon: '🏠',
    title: 'Espacios cerrados',
    desc: 'En cuevas o habitaciones cerradas la onda expansiva amplifica el daño. Usa desde una distancia segura.',
  },
];

export default function Warnings() {
  const refs = useRef([]);

  useEffect(() => {
    const observers = refs.current.map(el => {
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) el.classList.add('visible'); },
        { threshold: 0.2 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o?.disconnect());
  }, []);

  return (
    <section id="advertencias" className="warnings-section" style={{ maxWidth: '100%', padding: '80px 0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        <h2 className="section-title">⛔ Advertencias</h2>
        <div className="warnings-grid">
          {WARNINGS.map((w, i) => (
            <div
              key={w.title}
              className="warning-card fade-in"
              ref={el => refs.current[i] = el}
            >
              <span className="warning-badge">{w.icon}</span>
              <h3>{w.title}</h3>
              <p>{w.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
