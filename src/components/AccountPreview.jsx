import { useState } from 'react';

/**
 * AccountPreview — frontend-only "coming soon" registration UI.
 *
 * NO data is stored, sent, or persisted.
 * Passwords are never touched — the field is decorative only.
 * This communicates future value and builds trust.
 */
export default function AccountPreview() {
  const [submitted, setSubmitted] = useState(false);
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    // No network call, no storage — frontend preview only
    setSubmitted(true);
  }

  return (
    <section className="account-preview">
      <div className="account-preview-inner">

        {/* Left: copy */}
        <div className="account-preview-copy">
          <div className="account-preview-badge">Próximamente</div>
          <h2 className="account-preview-title">
            Tu cuenta<br /><em>MacroForge</em>
          </h2>
          <p className="account-preview-desc">
            Guardá tus productos favoritos, consultá más rápido
            y recibí ofertas exclusivas antes que nadie.
          </p>
          <ul className="account-preview-perks">
            <li>Lista de favoritos personalizada</li>
            <li>Historial de consultas</li>
            <li>Ofertas exclusivas para miembros</li>
            <li>Notificaciones de disponibilidad</li>
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

              {/* Password field — decorative only, never stored */}
              <div className="account-field">
                <label className="account-label" htmlFor="ap-pass">
                  Contraseña
                  <span className="account-label-note"> (para cuando esté listo)</span>
                </label>
                <input
                  id="ap-pass"
                  className="account-input"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="account-submit"
                disabled={!name.trim() || !email.trim()}
              >
                Unirme a la lista
              </button>

              <p className="account-disclaimer">
                Sin spam · Sin compromiso · Solo te avisamos cuando esté listo.
              </p>
            </form>
          ) : (
            <div className="account-success">
              <div className="account-success-icon" aria-hidden="true">✓</div>
              <h3 className="account-success-title">¡Listo, {name || 'gracias'}!</h3>
              <p className="account-success-msg">
                Pronto activaremos las cuentas MacroForge.
                Te avisaremos cuando puedas ingresar.
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
