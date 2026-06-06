

const CONTENT_MAP = {
  cgu: {
    title: "Conditions Générales d'Utilisation",
    content: "Bienvenue sur BioAthlete. L'utilisation de notre application implique l'acceptation de nos conditions. Les données générées par l'IA (Bioflow) sont fournies à titre indicatif et ne remplacent pas un avis médical. L'athlète reste responsable de son entraînement et de sa santé."
  },
  faq: {
    title: "Foire Aux Questions",
    content: "Q: Comment l'IA ajuste-t-elle mon programme ?\nR: L'IA utilise vos check-ins quotidiens (fatigue, sommeil) et vos retours de séances pour moduler l'intensité.\n\nQ: Puis-je connecter ma montre Garmin ?\nR: Oui, rendez-vous dans Profil > Appareils connectés."
  },
  support: {
    title: "Support et Assistance",
    content: "Vous rencontrez un problème ? Notre équipe est là pour vous aider. Envoyez un email à support@bioathlete.space avec une description détaillée de votre problème. Si vous avez une douleur persistante, veuillez consulter un professionnel de santé."
  },
  mentions: {
    title: "Mentions Légales",
    content: "Éditeur du site : BioAthlete Inc.\nDirecteur de la publication : Équipe SprintFlow\nHébergement : Vercel Inc.\nL'application est protégée par les lois sur la propriété intellectuelle."
  },
  privacy: {
    title: "Politique de Confidentialité",
    content: "Nous collectons des données liées à vos entraînements, votre nutrition et vos bilans de forme afin de nourrir notre algorithme IA et personnaliser votre coaching. Vos données sont chiffrées et ne sont en aucun cas revendues à des tiers."
  }
};

const Legal = ({ type }: { type: 'cgu' | 'faq' | 'support' | 'mentions' | 'privacy' }) => {
  const data = CONTENT_MAP[type];

  return (
    <div className="container" style={{ padding: '60px 24px' }}>
      <div className="glass-panel" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 className="text-gradient" style={{ fontSize: '36px', marginBottom: '32px' }}>{data.title}</h1>
        <div style={{ color: 'var(--icon)', fontSize: '16px', lineHeight: '1.8', whiteSpace: 'pre-line' }}>
          {data.content}
        </div>
      </div>
    </div>
  );
};

export default Legal;
