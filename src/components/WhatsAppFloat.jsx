import { WA_NUMBER } from '../data/catalog';

const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hola MacroForge! 💪 Quiero consultar el catálogo.')}`;

export default function WhatsAppFloat() {
  return (
    <>
      <a
        className="wa-float"
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
      >
        💬
      </a>
      <div className="wa-tooltip">WhatsApp · 8443-6311</div>
    </>
  );
}
