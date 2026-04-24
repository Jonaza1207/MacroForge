export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <button className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          ▲ Volver al inicio
        </button>
        <p className="footer-text">Hecho con ❤️ para la comunidad Minecraft</p>
        <p className="footer-copy">© 2024 TNT Guide — Solo con fines educativos</p>
      </div>
    </footer>
  );
}
