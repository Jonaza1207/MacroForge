const CURIOSITIES = [
  { icon: '📅', text: 'El TNT fue añadido en Minecraft Alpha 1.0.1 en 2010.' },
  { icon: '🌊', text: 'El agua absorbe la explosión del TNT, por lo que no daña bloques bajo el agua.' },
  { icon: '🔢', text: 'El TNT tiene una fuerza de explosión de 4, mientras que una cama en el Nether tiene 5.' },
  { icon: '🎮', text: 'Se necesitan 5 pólvoras y 4 arenas para craftear 1 TNT.' },
  { icon: '💡', text: 'El TNT cae como entidad al ser activado. Puede rodar por pendientes antes de explotar.' },
  { icon: '🧱', text: 'El bedrock y las estructuras de End son inmunes a las explosiones de TNT.' },
];

export default function CuriositiesModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-label="Curiosidades del TNT">
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        <h2 className="modal-title">🔍 Curiosidades del TNT</h2>
        <ul className="curiosity-list">
          {CURIOSITIES.map(c => (
            <li key={c.text}>
              <span>{c.icon}</span>
              <span>{c.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
