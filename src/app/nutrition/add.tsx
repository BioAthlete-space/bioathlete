import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { SelectionModal } from '../../components/SelectionModal';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown, SlideInRight } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';

// Helper to debounce API calls
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function NutritionAddScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  const mealType = (params.meal as string) || 'Petit-déjeuner';
  const targetDate = (params.date as string) || new Date().toISOString().split('T')[0];

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [quantityStr, setQuantityStr] = useState('100');
  const [selectedUnit, setSelectedUnit] = useState<string>('g');
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [recentFoodNames, setRecentFoodNames] = useState<Set<string>>(new Set());
  const [favoriteFoodNames, setFavoriteFoodNames] = useState<Set<string>>(new Set());
  const [listFilter, setListFilter] = useState<'recents' | 'frequent' | 'favoris'>('recents');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  useEffect(() => {
    const fetchFoods = async () => {
      if (!debouncedQuery || debouncedQuery.length < 3) {
        setLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: favData } = await supabase
              .from('favorite_foods')
              .select('*');
              
            const favNames = new Set<string>();
            if (favData) {
              favData.forEach((f: any) => favNames.add(f.food_name));
            }
            setFavoriteFoodNames(favNames);

            const { data: history } = await supabase
              .from('nutrition_entries')
              .select('food_name, calories, proteins, carbs, fats, quantity_g, created_at')
              .is('is_ai_estimated', false)
              .order('created_at', { ascending: false })
              .limit(100);
            
            if (history) {
              const names = new Set<string>();
              history.forEach((h: any) => names.add(h.food_name));
              setRecentFoodNames(names);

              if (listFilter === 'recents') {
                const uniqueHistory: any[] = [];
                const seen = new Set();
                for (const entry of history) {
                  if (!seen.has(entry.food_name)) {
                    seen.add(entry.food_name);
                    const multiplier = 100 / (entry.quantity_g || 100);
                    uniqueHistory.push({
                      id: `hist_${uniqueHistory.length}`,
                      name: entry.food_name,
                      brand: '🕒 Récemment utilisé',
                      image: null,
                      calories: entry.calories * multiplier,
                      proteins: entry.proteins * multiplier,
                      carbs: entry.carbs * multiplier,
                      fats: entry.fats * multiplier,
                    });
                    if (uniqueHistory.length >= 10) break;
                  }
                }
                setResults(uniqueHistory);
              } else if (listFilter === 'frequent') {
                const counts: Record<string, { count: number, entry: any }> = {};
                for (const entry of history) {
                  if (!counts[entry.food_name]) {
                    counts[entry.food_name] = { count: 1, entry };
                  } else {
                    counts[entry.food_name].count++;
                  }
                }
                const sortedFrequent = Object.values(counts)
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 10)
                  .map(item => {
                    const entry = item.entry;
                    const multiplier = 100 / (entry.quantity_g || 100);
                    return {
                      id: `freq_${entry.food_name}`,
                      name: entry.food_name,
                      brand: `⭐ Utilisé ${item.count} fois`,
                      image: null,
                      calories: entry.calories * multiplier,
                      proteins: entry.proteins * multiplier,
                      carbs: entry.carbs * multiplier,
                      fats: entry.fats * multiplier,
                    };
                  });
                setResults(sortedFrequent);
              }
            }

            if (listFilter === 'favoris' && favData) {
              const favResults = favData.map((f: any) => ({
                id: `fav_${f.id}`,
                name: f.food_name,
                brand: '🤍 Favoris',
                image: null,
                calories: f.calories_100g,
                proteins: f.proteins_100g,
                carbs: f.carbs_100g,
                fats: f.fats_100g,
              }));
              setResults(favResults);
            }
          }
        } catch (e) {
          console.warn("Erreur listes par défaut:", e);
        } finally {
          setLoading(false);
        }
        return;
      }
      
      setLoading(true);
      try {
        let formattedProducts: any[] = [];
        const normalizeString = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        let ciqualNames = new Set<string>();

        let ciqualQuery = supabase.from('ciqual_foods').select('*');
        const words = debouncedQuery.split(' ').map(w => w.trim()).filter(w => w.length > 2 && !['les', 'des', 'aux', 'avec'].includes(w.toLowerCase()));
        
        if (words.length > 1) {
          words.forEach(w => {
            ciqualQuery = ciqualQuery.ilike('name_fr', `%${w}%`);
          });
        } else {
          ciqualQuery = ciqualQuery.ilike('name_fr', `%${debouncedQuery}%`);
        }
        ciqualQuery = ciqualQuery.limit(200);

        const [ciqualRes, offRes] = await Promise.allSettled([
          ciqualQuery,
          fetch(`https://fr.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(debouncedQuery)}&search_simple=1&action=process&json=1&page_size=15&sort_by=unique_scans_n`)
            .then(res => res.json())
        ]);

        if (ciqualRes.status === 'fulfilled' && ciqualRes.value.data) {
          const queryNorm = normalizeString(debouncedQuery);
          const sortedCiqual = ciqualRes.value.data.sort((a: any, b: any) => {
            const aName = normalizeString(a.name_fr);
            const bName = normalizeString(b.name_fr);
            
            if (aName === queryNorm) return -1;
            if (bName === queryNorm) return 1;
            
            const aStarts = aName.startsWith(queryNorm);
            const bStarts = bName.startsWith(queryNorm);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            
            return aName.length - bName.length;
          }).slice(0, 15);
          
          const ciqualData = sortedCiqual.map((p: any) => {
            ciqualNames.add(normalizeString(p.name_fr));
            return {
              id: p.id,
              name: p.name_fr,
              brand: '',
              image: null,
              calories: p.calories_100g || 0,
              proteins: p.proteins_100g || 0,
              carbs: p.carbs_100g || 0,
              fats: p.fats_100g || 0,
            };
          }).filter((p: any) => {
            const cals = Number(p.calories);
            const prots = Number(p.proteins);
            const carbs = Number(p.carbs);
            const fats = Number(p.fats);
            if (isNaN(cals) || isNaN(prots) || isNaN(carbs) || isNaN(fats)) return false;
            if (cals <= 5 && prots <= 0.5 && carbs <= 0.5 && fats <= 0.5) return false;
            return true;
          });
          formattedProducts = [...formattedProducts, ...ciqualData];
        }

        if (offRes.status === 'fulfilled' && offRes.value.products) {
          const offData = offRes.value.products.map((p: any) => ({
            id: p.code,
            name: p.product_name || 'Inconnu',
            brand: '', 
            image: null, 
            calories: p.nutriments?.['energy-kcal_100g'] || 0,
            proteins: p.nutriments?.proteins_100g || 0,
            carbs: p.nutriments?.carbohydrates_100g || 0,
            fats: p.nutriments?.fat_100g || 0,
          })).filter((p: any) => {
            if (p.name === 'Inconnu') return false;
            const cals = Number(p.calories);
            const prots = Number(p.proteins);
            const carbs = Number(p.carbs);
            const fats = Number(p.fats);
            if (isNaN(cals) || isNaN(prots) || isNaN(carbs) || isNaN(fats)) return false;
            if (cals <= 5 && prots <= 0.5 && carbs <= 0.5 && fats <= 0.5) return false;
            
            const normName = normalizeString(p.name);
            let isDuplicate = false;
            ciqualNames.forEach(cName => {
              if (cName === normName || cName.includes(normName)) isDuplicate = true;
            });
            return !isDuplicate;
          });
          formattedProducts = [...formattedProducts, ...offData];
        }

        if (formattedProducts.length === 0) {
          const prompt = `L'utilisateur a cherché "${debouncedQuery}" mais la base de données n'a rien trouvé. 
Suggère 3 aliments génériques ou ingrédients simples correspondants, avec leurs valeurs nutritionnelles pour 100g.
Renvoie UNIQUEMENT un JSON contenant un tableau "products" respectant EXACTEMENT ce format :
{ "products": [ { "id": "ia_1", "name": "Nom de l'aliment suggéré", "brand": "", "image": "", "calories": 100, "proteins": 20, "carbs": 10, "fats": 5 } ] }
Ne renvoie absolument aucun autre texte, juste le JSON.`;

          const aiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2 }
              })
            }
          );
          
          const aiData = await aiResponse.json();
          const textOutput = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (textOutput) {
            try {
              const cleanJson = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
              const parsed = JSON.parse(cleanJson);
              if (parsed && parsed.products) {
                formattedProducts = parsed.products;
              }
            } catch (e) {
              console.warn("Erreur parsing JSON Gemini Fallback:", e);
            }
          }
        }
        
        setResults(formattedProducts);
      } catch (err) {
        console.warn("Erreur de recherche globale:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFoods();
  }, [debouncedQuery, listFilter]);

  const mapMealTypeToDB = (frontendMeal: string) => {
    if (frontendMeal === 'Petit-déjeuner') return 'breakfast';
    if (frontendMeal === 'Déjeuner') return 'lunch';
    if (frontendMeal === 'Collation') return 'snack';
    if (frontendMeal === 'Dîner') return 'dinner';
    return 'snack';
  };

  const [enriching, setEnriching] = useState(false);
  const [enrichedUnit, setEnrichedUnit] = useState<{ countable: boolean, unitName: string | null, unitWeight: number | null, isLiquid: boolean, healthScore: number | null, healthReason: string | null }>({
    countable: false, unitName: null, unitWeight: null, isLiquid: false, healthScore: null, healthReason: null
  });
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (selectedFood) {
      setIsFavorite(favoriteFoodNames.has(selectedFood.name));
    }
  }, [selectedFood, favoriteFoodNames]);

  const toggleFavorite = async () => {
    if (!selectedFood) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      if (isFavorite) {
        await supabase.from('favorite_foods').delete().match({ user_id: user.id, food_name: selectedFood.name });
        const newNames = new Set(favoriteFoodNames);
        newNames.delete(selectedFood.name);
        setFavoriteFoodNames(newNames);
        setIsFavorite(false);
      } else {
        await supabase.from('favorite_foods').insert({
          user_id: user.id,
          food_name: selectedFood.name,
          calories_100g: selectedFood.calories,
          proteins_100g: selectedFood.proteins,
          carbs_100g: selectedFood.carbs,
          fats_100g: selectedFood.fats
        });
        const newNames = new Set(favoriteFoodNames);
        newNames.add(selectedFood.name);
        setFavoriteFoodNames(newNames);
        setIsFavorite(true);
      }
    } catch (e) {
      console.warn("Erreur toggle favori", e);
    }
  };

  const handleSelectFood = (item: any) => {
    setSelectedFood(item);
    setEnrichedUnit({ countable: false, unitName: null, unitWeight: null, isLiquid: false, healthScore: null, healthReason: null });
    setSelectedUnit('g');
    setQuantityStr('100');
    setEnriching(true);
    
    // Appel à l'IA en arrière-plan sans bloquer l'UI
    (async () => {
      try {
        const prompt = `L'utilisateur a sélectionné l'aliment : "${item.name}".
Détermine son type de portionnage idéal ET son score de santé.
1. Portionnage: Est-ce un aliment qui se compte généralement par unités standards (ex: oeuf ~50g, tranche de pain de mie ~30g, cookie ~15g, pomme ~150g) ? 
ATTENTION : Les viandes (escalope de poulet, steak), les poissons, le riz, les pâtes NE SONT PAS dénombrables avec un poids fixe, ils se pèsent en grammes. Dis "countable": false pour eux.
2. Liquide: Est-ce un liquide (se mesurant en ml plutôt qu'en grammes) ?
3. Santé: Donne un "health_score" entier de 0 à 10. Pénalise fortement les produits ultra-transformés/industriels (0-4), note moyennement les produits un peu transformés (5-7) et donne une excellente note aux produits bruts naturels (8-10). Fournis aussi un "health_reason" court (1 phrase max).
Renvoie UNIQUEMENT un objet JSON (sans bloc markdown) avec ce format EXACT :
{ "countable": boolean, "unit_name": "nom de l'unité au singulier (ex: œuf, tranche, pièce)" ou null, "unit_weight_g": poids d'une unité en grammes (nombre) ou null, "is_liquid": boolean, "health_score": nombre, "health_reason": "string" }`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.1 }
            })
          }
        );
        
        const data = await response.json();
        const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (textOutput) {
          const cleanJson = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed) {
            const isCountable = !!parsed.countable;
            const uName = parsed.unit_name || null;
            let uWeight = parsed.unit_weight_g;
            if (typeof uWeight === 'string') uWeight = parseFloat(uWeight.replace(',', '.'));
            if (!uWeight || isNaN(uWeight)) uWeight = 100; // Fallback to 100g if AI fails to provide it
            const isLiq = !!parsed.is_liquid;
            
            setEnrichedUnit({
              countable: isCountable,
              unitName: uName,
              unitWeight: uWeight,
              isLiquid: isLiq,
              healthScore: typeof parsed.health_score === 'number' ? parsed.health_score : null,
              healthReason: parsed.health_reason || null
            });
            if (isCountable && uName) {
              setSelectedUnit(uName);
              setQuantityStr(prev => prev === '100' ? '1' : prev);
            } else {
              setSelectedUnit(isLiq ? 'ml' : 'g');
            }
          }
        }
      } catch (e) {
        console.warn("Erreur AI Enrichment:", e);
      } finally {
        setEnriching(false);
      }
    })();
  };

  const getFinalQtyGrams = () => {
    const rawQty = parseFloat(quantityStr.replace(',', '.')) || 0;
    if (selectedUnit !== 'g' && selectedUnit !== 'ml') {
      return rawQty * (enrichedUnit.unitWeight || 100);
    }
    return rawQty;
  };

  const handleSave = async () => {
    if (!selectedFood) return;

    const rawQty = parseFloat(quantityStr) || 0;
    if (rawQty <= 0) return;
    
    let finalQtyGrams = getFinalQtyGrams();

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let logId;
      const { data: existingLog } = await supabase
        .from('nutrition_logs')
        .select('id, total_calories, total_proteins, total_carbs, total_fats')
        .eq('user_id', user.id)
        .eq('log_date', targetDate)
        .maybeSingle();

      const multiplier = finalQtyGrams / 100;
      const addedCals = Math.round(selectedFood.calories * multiplier);
      const addedProts = Math.round(selectedFood.proteins * multiplier);
      const addedCarbs = Math.round(selectedFood.carbs * multiplier);
      const addedFats = Math.round(selectedFood.fats * multiplier);

      if (existingLog) {
        logId = existingLog.id;
        await supabase
          .from('nutrition_logs')
          .update({
            total_calories: (existingLog.total_calories || 0) + addedCals,
            total_proteins: (existingLog.total_proteins || 0) + addedProts,
            total_carbs: (existingLog.total_carbs || 0) + addedCarbs,
            total_fats: (existingLog.total_fats || 0) + addedFats
          })
          .eq('id', logId);
      } else {
        const { data: newLog, error: logError } = await supabase
          .from('nutrition_logs')
          .insert({
            user_id: user.id,
            log_date: targetDate,
            total_calories: addedCals,
            total_proteins: addedProts,
            total_carbs: addedCarbs,
            total_fats: addedFats
          })
          .select('id')
          .single();

        if (logError) throw logError;
        if (newLog) logId = newLog.id;
      }

      if (logId) {
        await supabase.from('nutrition_entries').insert({
          log_id: logId,
          food_name: selectedFood.name,
          quantity_g: finalQtyGrams,
          calories: addedCals,
          proteins: addedProts,
          carbs: addedCarbs,
          fats: addedFats,
          meal_type: mapMealTypeToDB(mealType),
          unit: selectedUnit,
          original_quantity: parseFloat(quantityStr) || 0
        });
      }

      router.back();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de l'aliment:", error);
      alert("Erreur lors de l'enregistrement. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const showKcal = item.calories > 0;
    const isRecent = recentFoodNames.has(item.name) || item.brand === '🕒 Récemment utilisé';
    
    return (
      <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
        <TouchableOpacity
          style={[styles.resultItem, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
          onPress={() => handleSelectFood(item)}
        >
          <View style={[styles.foodInfo, { marginLeft: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: Layout.spacing.lg }}>
              <Text style={[styles.foodName, { color: theme.text, fontSize: 16, fontWeight: 'bold', flexShrink: 1 }]} numberOfLines={1}>{item.name}</Text>
              {isRecent && <MaterialIcons name="history" size={16} color={theme.icon} />}
            </View>
            <Text style={[styles.foodMacros, { color: theme.icon, fontSize: 13, marginTop: 4 }]}>
              {showKcal ? `${Math.round(item.calories)} kcal / 100g` : 'Calories non spécifiées'}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        leftContent={
          <TouchableOpacity onPress={() => {
            if (selectedFood) {
              setSelectedFood(null);
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/nutrition/summary');
            }
          }} style={styles.closeBtn}>
            <MaterialIcons name="arrow-back" size={28} color={theme.text} />
          </TouchableOpacity>
        }
        rightContent={
          selectedFood ? (
            <TouchableOpacity onPress={toggleFavorite} style={styles.closeBtn}>
              <MaterialIcons name={isFavorite ? "favorite" : "favorite-border"} size={28} color={isFavorite ? "#EF4444" : theme.icon} />
            </TouchableOpacity>
          ) : undefined
        }
        title={selectedFood ? "Détails de l'aliment" : `Ajouter - ${mealType}`}
      />

      <View style={styles.content}>
        {!selectedFood ? (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.hubContainer}>
              <TouchableOpacity style={[styles.hubBtn, { backgroundColor: theme.surfaceSecondary, flex: 1 }]} onPress={() => router.push({ pathname: '/nutrition/camera-hub', params: { mode: 'photo', meal: mealType, date: targetDate } })}>
                <MaterialIcons name="camera-alt" size={36} color="#8B5CF6" />
                <Text style={[styles.hubText, { color: theme.text }]}>Photo IA</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.hubBtn, { backgroundColor: theme.surfaceSecondary, flex: 1 }]} onPress={() => router.push({ pathname: '/nutrition/text-ai', params: { meal: mealType, date: targetDate } })}>
                <MaterialIcons name="chat" size={36} color="#10B981" />
                <Text style={[styles.hubText, { color: theme.text }]}>Saisie Texte IA</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
              <MaterialIcons name="search" size={24} color={theme.icon} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder={`Rechercher un aliment...`}
                placeholderTextColor={theme.icon}
                value={query}
                onChangeText={setQuery}
              />
              {query.length > 0 ? (
                <TouchableOpacity onPress={() => setQuery('')} style={{ padding: 4 }}>
                  <MaterialIcons name="cancel" size={20} color={theme.icon} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={() => router.push({ pathname: '/nutrition/camera-hub', params: { mode: 'barcode', meal: mealType, date: targetDate } })}
                  style={{ padding: 4, backgroundColor: theme.primary, borderRadius: 12, marginLeft: 8 }}
                >
                  <MaterialIcons name="qr-code-scanner" size={20} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.filtersContainer}>
              <TouchableOpacity style={[styles.filterDropdown, { backgroundColor: theme.surfaceSecondary }]}>
                <Text style={[styles.filterText, { color: theme.text }]}>Aliments</Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color={theme.icon} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterDropdown, { backgroundColor: theme.surfaceSecondary }]}
                onPress={() => setFilterModalVisible(true)}
              >
                <Text style={[styles.filterText, { color: theme.text }]}>
                  {listFilter === 'recents' ? 'Récents' : listFilter === 'frequent' ? 'Fréquents' : 'Favoris'}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color={theme.icon} />
              </TouchableOpacity>
            </View>

            {loading && !results.length ? (
              <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: Layout.spacing.xl }} />
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  query.length > 2 && !loading ? (
                    <Text style={{ color: theme.icon, textAlign: 'center', marginTop: Layout.spacing.xl }}>Aucun résultat trouvé.</Text>
                  ) : null
                }
              />
            )}
          </Animated.View>
        ) : (
          <Animated.View entering={SlideInRight.springify()} style={[styles.selectedFoodContainer, { flex: 1, justifyContent: 'center' }]}>
            <Card style={[styles.foodDetailsCard, { marginBottom: Layout.spacing.xl }]} elevation="medium">
              <View style={{ marginBottom: Layout.spacing.lg }}>
                <Text style={[styles.selectedFoodName, { color: theme.text, textAlign: 'center', marginBottom: Layout.spacing.md }]}>{selectedFood.name}</Text>
                
                {enrichedUnit.healthScore !== null && (
                  <View style={{ alignItems: 'center', marginBottom: Layout.spacing.lg }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: enrichedUnit.healthScore >= 8 ? '#10B98122' : enrichedUnit.healthScore >= 5 ? '#F59E0B22' : '#EF444422', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                      <MaterialIcons name="health-and-safety" size={20} color={enrichedUnit.healthScore >= 8 ? '#10B981' : enrichedUnit.healthScore >= 5 ? '#F59E0B' : '#EF4444'} />
                      <Text style={{ color: enrichedUnit.healthScore >= 8 ? '#10B981' : enrichedUnit.healthScore >= 5 ? '#F59E0B' : '#EF4444', fontWeight: 'bold', marginLeft: 6 }}>
                        Score Santé: {enrichedUnit.healthScore}/10
                      </Text>
                    </View>
                    {enrichedUnit.healthReason && (
                      <Text style={{ color: theme.icon, fontSize: 13, textAlign: 'center', marginTop: 8 }}>{enrichedUnit.healthReason}</Text>
                    )}
                  </View>
                )}
                {selectedFood.brand ? <Text style={[styles.selectedFoodBrand, { color: theme.icon, textAlign: 'center' }]}>{selectedFood.brand}</Text> : null}
              </View>

              <View style={[styles.macrosSummary, { backgroundColor: theme.surfaceSecondary }]}>
                {['Calories', 'Protéines', 'Glucides', 'Lipides'].map((macro, idx) => {
                  const finalQtyGrams = getFinalQtyGrams();
                  const multiplier = finalQtyGrams / 100;
                  let val = 0;
                  let unit = 'g';
                  if (idx === 0) { val = selectedFood.calories * multiplier; unit = 'kcal'; }
                  if (idx === 1) val = selectedFood.proteins * multiplier;
                  if (idx === 2) val = selectedFood.carbs * multiplier;
                  if (idx === 3) val = selectedFood.fats * multiplier;

                  return (
                    <View key={macro} style={styles.macroBox}>
                      <Text style={[styles.macroVal, { color: theme.text }]}>{Math.round(val)}{unit}</Text>
                      <Text style={[styles.macroLabel, { color: theme.icon }]}>{macro}</Text>
                    </View>
                  );
                })}
              </View>

              <View style={[styles.quantityContainer, { justifyContent: 'center', gap: Layout.spacing.md, marginTop: Layout.spacing.md }]}>
                {enriching ? (
                  <ActivityIndicator color={theme.primary} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Layout.spacing.md }}>
                    <TextInput
                      style={[styles.quantityInput, { color: theme.text, backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                      keyboardType="numeric"
                      value={quantityStr}
                      onChangeText={setQuantityStr}
                    />
                    <TouchableOpacity 
                      style={[styles.unitSelector, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                      onPress={() => setUnitModalVisible(true)}
                    >
                      <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}>
                        {selectedUnit === 'g' ? 'g' : selectedUnit === 'ml' ? 'ml' : selectedUnit}
                      </Text>
                      <MaterialIcons name="keyboard-arrow-down" size={24} color={theme.icon} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              {enrichedUnit.countable && enrichedUnit.unitWeight && selectedUnit !== 'g' && selectedUnit !== 'ml' && !enriching && (
                <Text style={{ color: theme.icon, fontSize: 13, textAlign: 'center', marginTop: -Layout.spacing.xs, marginBottom: Layout.spacing.lg }}>
                  Soit environ {Math.round((parseFloat(quantityStr) || 0) * enrichedUnit.unitWeight)} {enrichedUnit.isLiquid ? 'ml' : 'g'}
                </Text>
              )}
              
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.primary, marginTop: Layout.spacing.md }]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Valider l'ajout</Text>
                )}
              </TouchableOpacity>
            </Card>
          </Animated.View>
        )}
      </View>
      <SelectionModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        title="Filtrer par"
        options={[
          { label: 'Récents', value: 'recents' },
          { label: 'Fréquents', value: 'frequent' },
          { label: 'Favoris', value: 'favoris' }
        ]}
        onSelect={(val) => {
          setListFilter(val as any);
          setFilterModalVisible(false);
        }}
      />

      <SelectionModal
        visible={unitModalVisible}
        onClose={() => setUnitModalVisible(false)}
        title="Unité"
        options={[
          ...(enrichedUnit.countable && enrichedUnit.unitName ? [{ label: `${enrichedUnit.unitName.charAt(0).toUpperCase() + enrichedUnit.unitName.slice(1)}s`, value: enrichedUnit.unitName }] : []),
          { label: 'Grammes (g)', value: 'g' },
          { label: 'Millilitres (ml)', value: 'ml' }
        ]}
        onSelect={(val) => {
          setSelectedUnit(val);
          if (val === 'g' || val === 'ml') setQuantityStr('100');
          else setQuantityStr('1');
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeBtn: {
    padding: Layout.spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    borderRadius: 25,
    borderWidth: 1,
    height: 50,
    marginBottom: Layout.spacing.md,
  },
  searchIcon: {
    marginRight: Layout.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: Typography.sizes.md,
  },
  listContent: {
    paddingBottom: Layout.spacing.xxl,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    marginBottom: Layout.spacing.md,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  foodBrand: {
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
  foodMacros: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
    fontWeight: Typography.weights.medium,
  },
  selectedFoodContainer: {
    flex: 1,
    marginTop: Layout.spacing.md,
  },
  foodDetailsCard: {
    padding: Layout.spacing.lg,
  },
  backToSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  largeFoodImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
    marginBottom: Layout.spacing.md,
  },
  selectedFoodName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  selectedFoodBrand: {
    fontSize: Typography.sizes.md,
    marginTop: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.xl,
    marginTop: Layout.spacing.lg,
  },
  quantityLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  quantityInput: {
    width: 100,
    height: 56,
    borderWidth: 1,
    borderRadius: Layout.borderRadius.md,
    textAlign: 'center',
    fontSize: Typography.sizes.lg,
    fontWeight: 'bold',
  },
  unitSelector: {
    borderWidth: 1,
    borderRadius: Layout.borderRadius.md,
    height: 56,
    paddingHorizontal: Layout.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 100,
  },
  macrosSummary: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    marginBottom: Layout.spacing.xl,
  },
  macroBox: {
    alignItems: 'center',
    flex: 1,
  },
  macroVal: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  macroLabel: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
  },
  saveBtn: {
    padding: Layout.spacing.md,
    borderRadius: 25,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  hubContainer: {
    flexDirection: 'row',
    gap: Layout.spacing.md,
    marginBottom: Layout.spacing.lg,
  },
  hubBtn: {
    height: 90,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.xs,
  },
  hubText: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
