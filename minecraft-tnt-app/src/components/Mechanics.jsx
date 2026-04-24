import { useEffect, useRef } from 'react';

const ACTIVATION_METHODS = [
  {
    icon: '⚡',
    title: 'Redstone',
    desc: 'Conecta un circuito de redstone al TNT. Una señal de corriente activa el temporizador.',
  },
  {
    icon: '🔥',
    title: 'Encendedor',
    desc: 'Usa un encendedor (Flint & Steel) para encender el TNT directamente con clic derecho.',
  },
  {
    icon: '💥',
    title: 'Explosión cercana',
    desc: 'La explosión de otro TNT, creeper, o carga de fuego activará el TNT adyacente.',
  },
];

const TIMELINE = [
  { icon: '💣', label: 'Activado', danger: false },
  { icon: '✨', label: 'Mecha (4s)', danger: false },
  { icon: '⚡', label: 'Parpadeo', danger: false },
  { icon: '💥', label: '¡BOOM!', danger: true },
];

const STATS = [
  { value: '4s', label: 'Tiempo de mecha' },
  { value: '~4', label: 'Bloques de radio' },
  { value: '0-25%', label: 'Items que caen' },
  { value: '77', label: 'Fuerza de explosión' },
];

export default function Mechanics() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('visible'); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="mecanica">
      <h2 className="section-title">⚙ Mecánicas del TNT</h2>

      <div className="mechanics-wrapper fade-in" ref={ref}>
        <p className="subsection-title">— Métodos de Activación —</p>
        <div className="activation-cards">
          {ACTIVATION_METHODS.map(m => (
            <div className="activation-card" key={m.title}>
              <span className="card-icon">{m.icon}</span>
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
            </div>
          ))}
        </div>

        <p className="subsection-title">— Ciclo de Explosión —</p>
        <div className="fuse-timeline">
          {TIMELINE.map((step, i) => (
            <>
              <div className={`timeline-step${step.danger ? ' danger' : ''}`} key={step.label}>
                <span className="step-icon">{step.icon}</span>
                <p>{step.label}</p>
              </div>
              {i < TIMELINE.length - 1 && (
                <span className="timeline-arrow" key={`arrow-${i}`}>→</span>
              )}
            </>
          ))}
        </div>

        <p className="subsection-title">— Estadísticas —</p>
        <div className="stats-grid">
          {STATS.map(s => (
            <div className="stat-card" key={s.label}>
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
