import { useState } from 'react';

/**
 * AccountPreview — Early-access waitlist capture.
 *
 * Honest purpose: collect interest for the MacroForge Members program
 * before it launches. No accounts, no login, no data persistence.
 * The form is a premium expression of "we're building this for you."
 *
 * Security: NO data is sent, stored, or persisted anywhere.
 * This is a frontend-only interest capture UI.
 */
export default function AccountPreview() {
  const [submitted, setSubmitted] = useState(false);
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    // No network call, no storage — frontend interest capture only
    setSubmitted(true);
  }

  return (
    <section className="account-preview">
      <div className="account-preview-inner">

        {/* Left: copy */}
        <div className="account-preview-copy">
          <div className="account-preview-badge">Miembros fundadores</div>
          <h2 className="account-preview-title">
            Acceso prioritario<br /><em>MacroForge</em>
          </h2>
          <p className="account-preview-desc">
            Estamos construyendo el programa de membresía MacroForge.
            Los primeros en registrarse tendrán acceso prioritario,
            precios preferenciales y beneficios exclusivos desde el día uno.
          </p>
          <ul className="account-preview-perks">
            <li>Precios preferenciales para miembros</li>
            <li>Acceso anticipado a nuevos productos</li>
            <li>Notificaciones de disponibilidad directas</li>
            <li>Asesoría personalizada sin lista de espera</li>
          </ul>
        </div>

        {/* Right: form */}
        <div className="account-preview-form-wrap">
          {!submitted ? (
            <form
              className="account-preview-form"
              onSubmit={handleSubmit}
              noValidate
              autoComplete="off"
            >
              <div className="account-field">
                <label className="account-label" htmlFor="ap-name">Nombre</label>
                <input
                  id="ap-name"
                  className="account-input"
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>

              <div className="account-field">
                <label className="account-label" htmlFor="ap-email">Correo</label>
                <input
                  id="ap-email"
                  className="account-input"
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>

              <button
                type="submit"
                className="account-submit"
                disabled={!name.trim() || !email.trim()}
              >
                Reservar mi lugar
              </button>

              <p className="account-disclaimer">
                Sin spam · Sin compromiso · Te avisamos cuando se active el programa.
              </p>
            </form>
          ) : (
            <div className="account-success">
              <div className="account-success-icon" aria-hidden="true">✓</div>
              <h3 className="account-success-title">¡Listo, {name || 'gracias'}!</h3>
              <p className="account-success-msg">
                Tu lugar está reservado. Te avisaremos por correo
                cuando el programa de membresía MacroForge esté activo.
              </p>
              <button
                className="account-success-reset"
                onClick={() => { setSubmitted(false); setName(''); setEmail(''); }}
              >
                Registrar otro correo
              </button>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
