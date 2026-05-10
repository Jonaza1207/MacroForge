import { WA_NUMBER } from '../data/catalog';
import { analytics } from '../lib/analytics';
import { buildWaUrl } from '../lib/whatsapp';

const waUrl = buildWaUrl('float');

export default function WhatsAppFloat() {
  return (
    <div className="wa-float-wrap">
      <a
        className="wa-float"
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Consultar por WhatsApp"
        onClick={() => analytics.whatsappFloat('float_button')}
      >
        <svg className="wa-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.112.549 4.1 1.51 5.827L.057 23.82a.5.5 0 0 0 .623.623l5.993-1.453A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.888 0-3.657-.519-5.17-1.42l-.37-.22-3.556.862.862-3.556-.22-.37A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
      </a>
      <div className="wa-float-label">Asesoría gratis</div>
    </div>
  );
}
