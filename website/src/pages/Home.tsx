import React from 'react';

const Home = () => {
  return (
    <div>
      <section style={{ padding: '120px 0', textAlign: 'center', position: 'relative' }}>
        <div className="container">
          <h1 style={{ fontSize: '64px', fontWeight: '800', marginBottom: '24px', letterSpacing: '-2px' }}>
            Dominez votre <span className="primary-gradient">Saison</span>
          </h1>
          <p style={{ fontSize: '20px', color: 'var(--icon)', maxWidth: '600px', margin: '0 auto 40px', lineHeight: '1.8' }}>
            BioAthlete combine physiologie sportive et intelligence artificielle pour vous offrir un coaching d'athlétisme sur-mesure. Entraînement, nutrition, récupération.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button className="btn-primary">Commencer l'essai gratuit</button>
            <button className="btn-secondary">Voir les fonctionnalités</button>
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 0' }}>
        <div className="container">
          <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexWrap: 'wrap', gap: '40px', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: '1 1 300px' }}>
              <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>L'IA au service de votre performance.</h2>
              <p style={{ color: 'var(--icon)', marginBottom: '24px' }}>Notre coach virtuel Bioflow s'adapte à votre état de forme quotidien, ajuste vos macros et replanifie vos séances d'athlétisme dynamiquement.</p>
              <ul style={{ listStyle: 'none', color: 'var(--text)' }}>
                <li style={{ marginBottom: '12px' }}>✓ Suivi nutritionnel avancé</li>
                <li style={{ marginBottom: '12px' }}>✓ Ajustement de charge de travail</li>
                <li>✓ Périodisation Bompa & Issurin</li>
              </ul>
            </div>
            <div style={{ flex: '1 1 300px', background: 'var(--background)', borderRadius: '16px', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
              <span className="text-gradient" style={{ fontSize: '24px', fontWeight: 'bold' }}>Dashboard Preview</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
