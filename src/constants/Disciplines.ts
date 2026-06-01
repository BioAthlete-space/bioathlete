export interface DisciplineCategory {
  title: string;
  items: string[];
}

export const DISCIPLINES: DisciplineCategory[] = [
  {
    title: 'Sprint',
    items: ['60m', '100m', '200m', '400m'],
  },
  {
    title: 'Haies',
    items: ['60m Haies', '100m Haies', '110m Haies', '400m Haies'],
  },
  {
    title: 'Demi-fond',
    items: ['800m', '1500m'],
  },
  {
    title: 'Fond',
    items: ['3000m', '5000m', '10000m'],
  },
  {
    title: 'Sauts',
    items: ['Longueur', 'Triple saut', 'Hauteur', 'Perche'],
  },
  {
    title: 'Lancers',
    items: ['Poids', 'Disque', 'Marteau', 'Javelot'],
  },
  {
    title: 'Épreuves combinées',
    items: ['Décathlon', 'Heptathlon'],
  },
];
