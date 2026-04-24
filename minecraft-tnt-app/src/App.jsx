import { useState, useEffect } from 'react';
import './index.css';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Crafting from './components/Crafting';
import Mechanics from './components/Mechanics';
import Uses from './components/Uses';
import Warnings from './components/Warnings';
import Footer from './components/Footer';
import CuriositiesModal from './components/CuriositiesModal';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <>
      <Navbar theme={theme} onThemeToggle={toggleTheme} />
      <main>
        <Hero onOpenModal={() => setShowModal(true)} />
        <hr className="section-divider" />
        <Crafting />
        <hr className="section-divider" />
        <Mechanics />
        <hr className="section-divider" />
        <Uses />
        <Warnings />
      </main>
      <Footer />
      {showModal && <CuriositiesModal onClose={() => setShowModal(false)} />}
    </>
  );
}
