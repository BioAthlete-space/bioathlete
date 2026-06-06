# Audit UI/UX & Recommandations pour l'App BioAthlete (SprintFlow)

Ce rapport est destiné au développeur IA en charge de finaliser l'application BioAthlete avant son déploiement. Il contient un audit à 360 degrés de l'interface utilisateur (UI), de l'expérience utilisateur (UX), et du fonctionnement logique de l'IA, avec des consignes strictes pour l'architecture des éléments manquants.

L'objectif est d'atteindre un standard de production "prêt pour les stores", en respectant la charte "Frosted Titanium" mobile-first, tout en rendant chaque parcours logique, utile et sans impasse.

---

## 1. Principes Généraux UI/UX à Maintenir et Renforcer

- **Zéro donnée hardcodée** : Toutes les informations affichées doivent provenir de Supabase. Si un champ est vide, le composant doit se masquer dynamiquement plutôt que d'afficher des valeurs de secours (fallback).
- **Design System "Frosted Titanium"** : Les couleurs, le thème sombre avec l'accent vert néon (#00FF88) doivent être appliqués de manière cohérente. Assurez-vous de l'utilisation adéquate des effets `expo-glass-effect` et `expo-blur`.
- **Animations Parallax et Scroll-linked** : L'utilisation de `react-native-reanimated` et Framer Motion (côté Web si applicable) doit être intensifiée sur les transitions d'écrans (`FadeInUp`, `SlideInRight`, etc.), avec des interactions micro-animées (comme la compression au clic sur la `Card`).

---

## 2. Parcours Utilisateur & Éléments "Sans Issue" (Dead Ends)

Lors de l'audit, plusieurs boutons, liens et cartes ont été identifiés comme "sans issue" (non cliquables, affichant des alertes temporaires, ou menant nulle part). Chaque élément doit être fonctionnel.

### A. Écran de Profil (`src/app/(tabs)/profile.tsx` et `src/config/profileMenu.tsx`)
- **Problème** : Les entrées "Appareils connectés", "Modifier le mot de passe", "FAQ", "Besoin d'aide", "Signaler un problème", "CGU", "Mentions légales", "Politique de confidentialité" n'ont aucune action (`onPress`). "Langue" affiche une alerte temporaire (`Alert.alert('À venir')`).
- **Recommandations Architecturales & Consignes Dev** :
  - **Appareils connectés** : Créer `src/app/profile/devices.tsx`. L'écran doit lister les intégrations possibles (Apple Health, Google Fit - redirigeant potentiellement vers l'écran existant `health-sync.tsx`, Garmin, Strava) avec un statut (Connecté/Déconnecté).
  - **Modifier le mot de passe** : Créer `src/app/profile/password.tsx` avec un formulaire sécurisé (Ancien mot de passe, Nouveau, Confirmation) et une mise à jour via `supabase.auth.updateUser()`.
  - **Langue** : Remplacer l'alerte par l'ouverture d'un `SelectionModal` (comme utilisé ailleurs) pour choisir entre "Français" et "English", et sauvegarder cette préférence dans Supabase (`profiles.langue`) et `StorageService`.
  - **Aide et Légal (FAQ, Support, CGU, etc.)** : Regrouper ces liens vers un écran de contenu statique dynamique ou utiliser `WebBrowser` (`expo-web-browser`) pour ouvrir des pages hébergées sur le site officiel de l'application, afin de ne pas alourdir l'app avec du texte en dur.

### B. Parcours Nutrition (`src/app/(tabs)/nutrition.tsx`)
- **Problème** : La navigation est parfois confuse, et certains états (pas de repas logué) manquent de "call-to-action" clairs et animés.
- **Recommandations** :
  - Assurez-vous que le bouton `Ajouter` (`Link href="/nutrition/add"`) mène à un écran d'ajout rapide fonctionnel. L'UX doit permettre une entrée texte libre ou une photo que l'IA analyserait (voir partie IA).

### C. Écrans d'Exercices et Sessions (`src/app/exercises/` et `src/app/sessions/`)
- **Problème** : Ces écrans sont fonctionnels mais nécessitent une vérification que le flux d'annulation (`Retour`) renvoie bien à la page précédente sans perdre l'état.
- **Recommandations** : Intégrer un avertissement si l'utilisateur quitte la page de création sans avoir sauvegardé, pour éviter la perte de données (utilisation de `Alert` pour confirmer la sortie).

### D. Profil Athlète côté Coach (`src/app/(coach)/athlete/[id].tsx`)
- **Problème** : L'écran indique "Cette page est en cours de développement."
- **Recommandations Architecturales & Consignes Dev** :
  - **Développement de la Vue Athlète 360** : Cet écran doit être une véritable tour de contrôle pour le coach.
  - **Composants à inclure** :
    - Un header avec la photo de l'athlète, son statut (blessé, en forme).
    - Un graphique SVG animé (`ActivityRings` ou similaire) de sa charge d'entraînement.
    - Les résultats de ses derniers bilans de forme (Check-in).
    - La liste de ses prochaines compétitions (issues de `coach_periodizations`).
  - Utiliser des requêtes Supabase jointes pour récupérer ces données sans créer de latence.

---

## 3. Logique et Parcours d'Inscription / Connexion

### A. Flux Général (`src/app/auth/`)
- **Problème** : La transition entre la connexion et le dashboard (Tab vs Coach) doit être parfaitement fluide.
- **Recommandations** :
  - L'écran `register.tsx` (Athlète) utilise une liste très détaillée. S'assurer que le clavier mobile (KeyboardAvoidingView) ne bloque pas les champs du bas (ex: poids/taille).
  - Ajouter une étape de vérification ("Loading") esthétique (Logo Bioflow qui pulse) lors du login avant la redirection, pour masquer tout "saut" visuel lors du chargement des données.
  - S'assurer que les messages d'erreur de Supabase (ex: "User already exists") sont traduits en français avec des phrases humaines (ex: "Il semble qu'un compte existe déjà avec cette adresse email.").

---

## 4. UX et Comportement Logique de l'IA (`assistant.tsx`, `aiContext.ts`, `chat.tsx`)

C'est le cœur de l'application. L'IA doit avoir une posture de "vrai coach expert" et son UX doit être impeccable.

### A. Contexte et Compréhension (`aiContext.ts`)
- **Problème** : Le contexte envoyé à l'IA peut devenir très lourd si l'on prend tous les workouts et periodizations, ou manquer d'informations récentes sur l'état de fatigue du jour.
- **Consignes Dev** :
  - **Injection du Check-in journalier** : L'IA **doit absolument** avoir connaissance du bilan de forme du jour de l'athlète (ou des athlètes du groupe pour le coach). Récupérer la dernière entrée de `daily_checkins` et l'ajouter au contexte. Si l'athlète a des douleurs ("haspain: true"), l'IA doit adapter son discours et proposer de la récupération ou des soins.
  - **Filtrage temporel** : Ne fournir à l'IA que les 10 dernières séances et les 10 prochaines, plutôt que l'historique complet.

### B. Interface du Chat (`assistant.tsx` / `chat.tsx`)
- **Problème** : Un chat textuel long est fatiguant sur mobile. Les erreurs réseau affichent de simples `Alert`.
- **Recommandations UX & Consignes Dev** :
  - **Réponses structurées** : Forcer le modèle LLM (via le prompt système) à répondre en utilisant des bullet points, des listes courtes et des émojis pour la lisibilité sur mobile.
  - **Boutons d'Action Rapide (Quick Replies)** : Au lieu de forcer l'utilisateur à taper, l'IA devrait terminer ses réponses par 2 ou 3 suggestions cliquables (ex: ["Comment adapter ma séance ?", "Je ressens une douleur", "Valider cette planification"]). Créer un composant `QuickReplies` au-dessus de la zone de saisie.
  - **Gestion de l'erreur "humaine"** : En cas de surcharge de l'API ou de perte de connexion, ne pas utiliser d'Alerte système brute. Afficher un message dans le flux du chat venant de l'IA (ex: "Oups, je réfléchis un peu trop lentement, donnez-moi une seconde pour reprendre mon souffle...").
  - **Actions (Propositions)** : Si l'IA propose un exercice, un PDF ou une séance, la carte (ex: `proposedExercise`) doit comporter un bouton "Accepter et Planifier" (`onPress` qui exécute l'insertion Supabase) ET un bouton "Refuser/Modifier" pour relancer le dialogue. Actuellement, l'architecture prévoit `proposedEvents`, s'assurer que leur traitement insère les données en base de manière transparente avec un feedback visuel de succès (toast ou animation).

### C. Ton et Logique Humaine
- **Consignes Dev pour le Prompt Système** :
  - Définir strictement le persona : "Tu es un coach d'athlétisme expert de niveau olympique, spécialisé en physiologie et en planification (méthode Bompa/Issurin). Ton ton est direct, motivant, professionnel mais empathique."
  - L'IA ne doit jamais répondre "En tant qu'intelligence artificielle...". Elle doit assumer son rôle de coach virtuel au sein de l'application BioAthlete.

---

## 5. Recommandations Diverses à implémenter avant soumission Store

1. **Permissions Natives** : Lors des demandes d'accès (Caméra pour scanner les groupes, Localisation pour la météo), fournir des textes d'explication clairs dans `app.json` (iOS/Android) justifiant l'utilisation (ex: "BioAthlete utilise votre localisation pour vous fournir les conditions météo précises pour votre entraînement sur piste.").
2. **Gestion du Mode Hors-ligne** : Si l'utilisateur perd le réseau au stade, l'application devrait afficher le plan du jour mis en cache (via `AsyncStorage`, qui est déjà partiellement configuré dans `StorageService.ts`), au lieu d'un écran de chargement infini.
3. **Météo et Alertes (`weather.tsx` & `WeatherService.ts`)** : L'intégration est excellente. S'assurer que les "warnings" (Danger Verglas, Foudre) soient visuellement proéminents (bandeau rouge ou icône d'alerte clignotante) sur la page d'accueil (`(tabs)/index.tsx`).

---

**Conclusion** : Les bases de l'application sont très solides. L'effort final doit se concentrer sur l'élimination de toutes les zones mortes (écrans non implémentés), l'adoucissement des transitions d'erreur, et l'optimisation de l'IA pour qu'elle agisse non pas comme un chatbot standard, mais comme un moteur de recommandation proactif et contextuel.
