import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Image, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import Animated, { FadeInUp, SlideInDown } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';

export default function CameraHubScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const mode = (params.mode as 'photo' | 'barcode') || 'photo';
  const mealType = params.meal as string;
  const targetDate = params.date as string;

  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<'on' | 'off'>('off');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: Layout.spacing.xl }]}>
        <MaterialIcons name="camera-alt" size={64} color={theme.icon} style={{ marginBottom: Layout.spacing.lg }} />
        <Text style={{ color: theme.text, fontSize: Typography.sizes.lg, textAlign: 'center', marginBottom: Layout.spacing.xl }}>
          Autorisez l'accès à la caméra pour scanner ou analyser vos plats.
        </Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }]} onPress={requestPermission}>
          <Text style={styles.btnText}>Autoriser la caméra</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: Layout.spacing.lg }} onPress={() => router.back()}>
          <Text style={{ color: theme.icon }}>Annuler</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- LOGIC BARCODE ---
  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || mode !== 'barcode') return;
    setScanned(true);
    setLoading(true);

    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${data}.json`);
      const result = await res.json();

      if (result.status === 1 && result.product) {
        const p = result.product;
        const foodName = p.product_name || 'Produit Inconnu';
        const cals = p.nutriments?.['energy-kcal_100g'] || 0;
        const prots = p.nutriments?.proteins_100g || 0;
        const carbs = p.nutriments?.carbohydrates_100g || 0;
        const fats = p.nutriments?.fat_100g || 0;

        router.replace({
          pathname: '/nutrition/confirm-add',
          params: {
            food_name: foodName,
            calories_100g: cals.toString(),
            proteins_100g: prots.toString(),
            carbs_100g: carbs.toString(),
            fats_100g: fats.toString(),
            meal: mealType,
            date: targetDate
          }
        });
      } else {
        alert("Produit introuvable dans OpenFoodFacts.");
        setTimeout(() => setScanned(false), 2000);
      }
    } catch (error) {
      console.error("Erreur scan:", error);
      alert("Erreur réseau.");
      setTimeout(() => setScanned(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC PHOTO IA ---
  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets[0].base64) {
        setPhotoUri(result.assets[0].uri);
        analyzePhoto(result.assets[0].base64);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      if (photo && photo.uri && photo.base64) {
        setPhotoUri(photo.uri);
        analyzePhoto(photo.base64);
      }
    } catch (e) {
      console.error("Erreur capture:", e);
      alert("Impossible de prendre la photo.");
    }
  };

  const analyzePhoto = async (base64Image: string) => {
    setLoading(true);
    setAiResult(null);
    try {
      const prompt = `Agis comme un expert nutritionniste. Analyse cette image de repas. 
Estime les portions et donne moi les informations nutritionnelles de CHAQUE INGRÉDIENT OU ALIMENT distinct visible dans l'assiette.
Renvoie UNIQUEMENT un JSON contenant un TABLEAU d'objets, respectant EXACTEMENT ce format :
[
  { "food_name": "Description courte (ex: Steak haché)", "calories": 250, "proteins": 20, "carbs": 0, "fats": 15 },
  { "food_name": "Portion de frites", "calories": 350, "proteins": 4, "carbs": 45, "fats": 15 }
]
Ne renvoie absolument aucun autre texte, pas de balises markdown, juste le JSON valide sous forme de tableau.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }] }],
            generationConfig: { temperature: 0.2 }
          })
        }
      );

      const data = await response.json();
      const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (textOutput) {
        const cleanJson = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAiResult(parsed);
        } else {
          throw new Error("JSON Invalide ou vide");
        }
      }
    } catch (err) {
      console.warn("Erreur AI Vision:", err);
      alert("L'IA n'a pas pu analyser l'image.");
      setPhotoUri(null);
    } finally {
      setLoading(false);
    }
  };

  const mapMealTypeToDB = (frontendMeal: string) => {
    if (frontendMeal === 'Petit-déjeuner') return 'breakfast';
    if (frontendMeal === 'Déjeuner') return 'lunch';
    if (frontendMeal === 'Collation') return 'snack';
    if (frontendMeal === 'Dîner') return 'dinner';
    return 'snack';
  };

  const confirmAiResult = async () => {
    if (!aiResult) return;
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

      const addedCals = aiResult.reduce((sum: number, item: any) => sum + Math.round(item.calories), 0);
      const addedProts = aiResult.reduce((sum: number, item: any) => sum + Math.round(item.proteins), 0);
      const addedCarbs = aiResult.reduce((sum: number, item: any) => sum + Math.round(item.carbs), 0);
      const addedFats = aiResult.reduce((sum: number, item: any) => sum + Math.round(item.fats), 0);

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
        const entriesToInsert = aiResult.map((item: any) => ({
          log_id: logId,
          food_name: item.food_name + " (estimé IA)",
          quantity_g: 100, // Conceptuel
          calories: Math.round(item.calories),
          proteins: Math.round(item.proteins),
          carbs: Math.round(item.carbs),
          fats: Math.round(item.fats),
          meal_type: mapMealTypeToDB(mealType),
          is_ai_estimated: true
        }));
        
        await supabase.from('nutrition_entries').insert(entriesToInsert);
      }

      router.replace({ pathname: '/nutrition/summary', params: { meal: mealType, date: targetDate } });
    } catch (error) {
      console.error("Erreur d'enregistrement:", error);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  if (photoUri) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.topControls}>
          <TouchableOpacity onPress={() => { setPhotoUri(null); setAiResult(null); }} style={styles.floatingBackBtn}>
            <MaterialIcons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: Layout.spacing.lg, paddingBottom: 100 }}>
          <View style={{ width: '100%', height: 300, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 16, overflow: 'hidden', marginBottom: Layout.spacing.xl }}>
            <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', marginTop: Layout.spacing.xl }}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={{ color: theme.text, marginTop: Layout.spacing.md, fontSize: 16, fontWeight: 'bold' }}>Analyse de l'image en cours...</Text>
            </View>
          ) : aiResult ? (
            <Animated.View entering={SlideInDown.springify()}>
              <Card style={{ padding: Layout.spacing.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.md }}>
                  <MaterialIcons name="auto-awesome" size={24} color="#8B5CF6" />
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>Ce que l'IA a détecté :</Text>
                </View>
                
                <ScrollView style={{ maxHeight: 200, marginBottom: Layout.spacing.lg }}>
                  {aiResult.map((item: any, index: number) => (
                    <View key={index} style={{ marginBottom: Layout.spacing.sm, paddingBottom: Layout.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                      <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}>{item.food_name}</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={{ color: theme.primary }}>{item.calories} kcal</Text>
                        <Text style={{ color: theme.icon }}>P: {item.proteins}g | G: {item.carbs}g | L: {item.fats}g</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Layout.spacing.lg, padding: Layout.spacing.sm, backgroundColor: theme.surfaceSecondary, borderRadius: 8 }}>
                  <Text style={{ color: theme.text, fontWeight: 'bold' }}>Total Estimé</Text>
                  <Text style={{ color: theme.primary, fontWeight: 'bold' }}>
                    {aiResult.reduce((sum: number, item: any) => sum + item.calories, 0)} kcal
                  </Text>
                </View>

                <TouchableOpacity 
                  style={[styles.btn, { backgroundColor: theme.primary, marginBottom: Layout.spacing.md, alignItems: 'center' }]}
                  onPress={confirmAiResult}
                >
                  <Text style={styles.btnText}>Valider et continuer</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ alignItems: 'center', padding: Layout.spacing.sm }}
                  onPress={() => { setPhotoUri(null); setAiResult(null); }}
                >
                  <Text style={{ color: theme.icon }}>Prendre une autre photo</Text>
                </TouchableOpacity>
              </Card>
            </Animated.View>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={flash === 'on'}
        ref={cameraRef}
        onBarcodeScanned={scanned || mode !== 'barcode' ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_e", "upc_a"] }}
      />
      
      <View style={styles.overlay}>
        {/* Floating Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity onPress={() => router.back()} style={styles.floatingBackBtn}>
            <MaterialIcons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Center Target Box */}
        <View style={styles.targetBoxContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={styles.loadingText}>
                {mode === 'photo' ? "Analyse en cours..." : "Recherche du produit..."}
              </Text>
            </View>
          ) : (
            <View style={[styles.targetBox, mode === 'photo' ? styles.targetPhoto : styles.targetBarcode]}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          )}
          {!loading && (
            <Text style={styles.helperText}>
              {mode === 'photo' ? "Centrez votre assiette dans le cadre" : "Alignez le code-barres ici"}
            </Text>
          )}
        </View>

        {/* Bottom Controls */}
        {!loading && (
          <View style={styles.bottomControls}>
            <TouchableOpacity style={styles.sideBtn} onPress={pickFromGallery}>
              <MaterialIcons name="photo-library" size={28} color="#FFF" />
            </TouchableOpacity>

            {mode === 'photo' ? (
              <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                <View style={styles.captureBtnInner} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 80, height: 80 }} /> /* Spacer for barcode mode */
            )}

            <TouchableOpacity style={styles.sideBtn} onPress={() => setFlash(f => f === 'on' ? 'off' : 'on')}>
              <MaterialIcons name={flash === 'on' ? "flash-on" : "flash-off"} size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingBottom: Layout.spacing.xxl,
  },
  iconBtn: {
    padding: Layout.spacing.xs,
  },
  topControls: {
    paddingTop: 60, // Approximate safe area
    paddingHorizontal: Layout.spacing.lg,
  },
  floatingBackBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetBoxContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetBox: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetPhoto: {
    width: 280,
    height: 280,
  },
  targetBarcode: {
    width: 280,
    height: 150,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#FFF',
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  helperText: {
    color: '#FFF',
    fontSize: Typography.sizes.md,
    marginTop: Layout.spacing.xl,
    fontWeight: Typography.weights.bold,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.xl,
    paddingBottom: Layout.spacing.xl,
  },
  sideBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: Layout.spacing.xl,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    marginTop: Layout.spacing.md,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  btn: {
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  btnText: {
    color: '#FFF',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  }
});
