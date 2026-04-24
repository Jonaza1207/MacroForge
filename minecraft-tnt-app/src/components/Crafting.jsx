import { useEffect, useRef } from 'react';

const GRID = [
  { id: 1, type: 'gunpowder', icon: '⚫', label: 'Pólvora' },
  { id: 2, type: 'sand',      icon: '🟨', label: 'Arena'  },
  { id: 3, type: 'gunpowder', icon: '⚫', label: 'Pólvora' },
  { id: 4, type: 'sand',      icon: '🟨', label: 'Arena'  },
  { id: 5, type: 'gunpowder', icon: '⚫', label: 'Pólvora' },
  { id: 6, type: 'sand',      icon: '🟨', label: 'Arena'  },
  { id: 7, type: 'gunpowder', icon: '⚫', label: 'Pólvora' },
  { id: 8, type: 'sand',      icon: '🟨', label: 'Arena'  },
  { id: 9, type: 'gunpowder', icon: '⚫', label: 'Pólvora' },
];

export default function Crafting() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('visible'); },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="crafteo">
      <h2 className="section-title">⚒ Receta de Crafteo</h2>
      <div className="crafting-section fade-in" ref={ref}>
        <div className="crafting-container">
          <div className="crafting-grid">
            {GRID.map(cell => (
              <div className="craft-cell" key={cell.id} title={cell.label}>
                <span>{cell.icon}</span>
                <span className="cell-label">{cell.label}</span>
              </div>
            ))}
          </div>

          <span className="craft-arrow">➡</span>

          <div className="craft-result">
            <div className="craft-result-block" title="TNT">
              <span className="craft-result-label">TNT</span>
            </div>
            <span className="craft-result-text">x1 TNT</span>
          </div>
        </div>

        <p className="recipe-note">
          📦 Coloca 5 pólvoras y 4 arenas alternadas en la cuadrícula 3×3 para obtener 1 TNT.
        </p>
      </div>
    </section>
  );
}
