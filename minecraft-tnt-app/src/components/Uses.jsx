import { useEffect, useRef } from 'react';

const USES = [
  {
    icon: '⛏️',
    title: 'Minería Rápida',
    desc: 'Destruye grandes cantidades de bloques en segundos. Ideal para crear cuevas o túneles en segundos.',
    color: '#5a9e3c',
  },
  {
    icon: '🪤',
    title: 'Trampas',
    desc: 'Coloca TNT oculto bajo cofres o presión para sorprender a intrusos en tu base.',
    color: '#e07020',
  },
  {
    icon: '⚔️',
    title: 'PvP & Guerras',
    desc: 'Destruye muros enemigos, abre brechas en fortalezas y controla el campo de batalla.',
    color: '#cc2222',
  },
  {
    icon: '🏗️',
    title: 'Construcción',
    desc: 'Nivela terrenos irregulares y prepara grandes superficies para proyectos de construcción.',
    color: '#7b68ee',
  },
];

export default function Uses() {
  const refs = useRef([]);

  useEffect(() => {
    const observers = refs.current.map((el, i) => {
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
    <section id="usos">
      <h2 className="section-title">🎯 Usos del TNT</h2>
      <div className="uses-grid">
        {USES.map((use, i) => (
          <div
            key={use.title}
            className="use-card fade-in"
            ref={el => refs.current[i] = el}
            style={{ '--card-color': use.color }}
          >
            <span className="card-icon">{use.icon}</span>
            <h3>{use.title}</h3>
            <p>{use.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
