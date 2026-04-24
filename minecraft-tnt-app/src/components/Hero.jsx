import { useState, useEffect, useRef } from 'react';

export default function Hero({ onOpenModal }) {
  const [exploding, setExploding] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [hidden, setHidden] = useState(false);
  const timerRef = useRef(null);

  const handleExplode = () => {
    if (exploding) return;
    setExploding(true);
    setShowOverlay(true);
    setHidden(false);

    timerRef.current = setTimeout(() => {
      setExploding(false);
      setShowOverlay(false);
      setHidden(true);
      setTimeout(() => setHidden(false), 50);
    }, 1200);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <>
      {showOverlay && (
        <>
          <div className="explosion-overlay" />
          <div className="explosion-particles">💥</div>
        </>
      )}

      <section id="inicio" className="hero">
        <div className="hero-content">
          <div className={`tnt-block${exploding ? ' exploding' : ''}${hidden ? ' hidden' : ''}`}>
            <div className="tnt-face tnt-face-main">
              <span className="tnt-label">TNT</span>
            </div>
          </div>

          <h1 className="hero-title">La Guía Definitiva<br />del TNT</h1>
          <p className="hero-subtitle">
            Todo lo que necesitas saber sobre el explosivo más famoso de Minecraft:
            crafteo, mecánicas, usos y precauciones.
          </p>

          <div className="hero-buttons">
            <a href="#crafteo" className="btn btn-primary">Ver Crafteo</a>
            <button className="btn btn-danger" onClick={handleExplode}>
              💣 Activar TNT
            </button>
            <button className="btn" style={{ background: 'none', color: 'var(--color-accent-yellow)', borderColor: 'var(--color-accent-yellow)' }} onClick={onOpenModal}>
              🔍 Curiosidades
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
