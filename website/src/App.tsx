import { Routes, Route, Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import Home from './pages/Home';
import Legal from './pages/Legal';

function App() {
  return (
    <>
      <header className="header">
        <div className="container header-container">
          <Link to="/" className="logo">
            <Activity color="#00FF88" size={32} />
            <span style={{ color: '#FFF' }}>Bio<span style={{ color: '#00FF88' }}>Athlete</span></span>
          </Link>
          <nav className="nav-links">
            <Link to="/">Accueil</Link>
            <a href="https://app.bioathlete.space" className="text-gradient">Ouvrir l'App</a>
          </nav>
        </div>
      </header>

      <main style={{ paddingTop: '80px', minHeight: 'calc(100vh - 300px)' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cgu" element={<Legal type="cgu" />} />
          <Route path="/faq" element={<Legal type="faq" />} />
          <Route path="/support" element={<Legal type="support" />} />
          <Route path="/mentions-legales" element={<Legal type="mentions" />} />
          <Route path="/confidentialite" element={<Legal type="privacy" />} />
        </Routes>
      </main>

      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <div className="logo" style={{ marginBottom: '24px' }}>
              <Activity color="#00FF88" size={24} />
              <span style={{ color: '#FFF' }}>Bio<span style={{ color: '#00FF88' }}>Athlete</span></span>
            </div>
            <p style={{ color: 'var(--icon)' }}>L'application ultime pour l'athlétisme. Entraînement, nutrition, et récupération dopés par l'IA.</p>
          </div>
          <div>
            <h3>Produit</h3>
            <ul>
              <li><a href="#">Fonctionnalités</a></li>
              <li><a href="#">Tarifs</a></li>
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/support">Support</Link></li>
            </ul>
          </div>
          <div>
            <h3>Légal</h3>
            <ul>
              <li><Link to="/cgu">Conditions d'utilisation</Link></li>
              <li><Link to="/confidentialite">Confidentialité</Link></li>
              <li><Link to="/mentions-legales">Mentions Légales</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;
