/**
 * Client pour l'API Open Food Facts (OFF)
 * Respecte les "Règles d'Or" de l'API OFF :
 * 1. User-Agent personnalisé obligatoire.
 * 2. Utilisation de l'API v2 pour les recherches structurées.
 * 3. Pas de requêtes HTTP à chaque lettre tapée (Search-as-you-type interdit).
 */

const OFF_API_BASE_URL = 'https://world.openfoodfacts.org';
const OFF_API_V2_BASE_URL = 'https://world.openfoodfacts.org/api/v2';

const headers = {
  'User-Agent': 'BioAthlete/1.0 (kleveens@email)', // Règle 4: Obligatoire
  'Accept': 'application/json',
};

export interface OFFProduct {
  code: string;
  product_name: string;
  brands?: string;
  image_front_url?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
  categories_tags?: string[];
}

/**
 * Scénario A : Recherche par Code-barres
 * Utilise l'endpoint v2 pour récupérer instantanément les macros d'un produit scanné.
 */
export async function getProductByBarcode(barcode: string): Promise<OFFProduct | null> {
  try {
    const response = await fetch(`${OFF_API_V2_BASE_URL}/product/${barcode}?fields=code,product_name,brands,image_front_url,nutriments,categories_tags`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Erreur API OFF: ${response.status}`);
    }

    const data = await response.json();
    if (data.status === 1 && data.product) {
      return data.product as OFFProduct;
    }
    return null;
  } catch (error) {
    console.error("Erreur lors de la récupération du produit par code-barre:", error);
    return null;
  }
}

/**
 * Recherche structurée par catégorie (API v2)
 * Règle 1: Utiliser des filtres de tags explicites au lieu d'une simple recherche plein texte.
 */
export async function searchByCategory(categoryTag: string): Promise<OFFProduct[]> {
  try {
    const response = await fetch(`${OFF_API_V2_BASE_URL}/search?categories_tags_en=${encodeURIComponent(categoryTag)}&fields=code,product_name,brands,image_front_url,nutriments,categories_tags&page_size=20`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Erreur API OFF Search: ${response.status}`);
    }

    const data = await response.json();
    if (data.products && Array.isArray(data.products)) {
      return data.products as OFFProduct[];
    }
    return [];
  } catch (error) {
    console.error("Erreur lors de la recherche par catégorie:", error);
    return [];
  }
}
