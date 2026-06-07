import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../../components/Header';

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
    try {
      const prompt = `Agis comme un expert nutritionniste. Analyse cette image de repas. 
Estime les portions et donne moi les informations nutritionnelles pour ce que tu vois dans l'assiette (la portion totale visible).
Renvoie UNIQUEMENT un JSON respectant EXACTEMENT ce format :
{ "food_name": "Nom du plat complet", "calories": 500, "proteins": 30, "carbs": 40, "fats": 20 }
Ne renvoie aucun autre texte.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`,
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
        
        if (parsed.food_name) {
          router.replace({
            pathname: '/nutrition/confirm-add',
            params: {
              food_name: parsed.food_name + " (estimé IA)",
              calories_100g: parsed.calories.toString(),
              proteins_100g: parsed.proteins.toString(),
              carbs_100g: parsed.carbs.toString(),
              fats_100g: parsed.fats.toString(),
              meal: mealType,
              date: targetDate
            }
          });
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

  return (
    <View style={styles.container}>
      {!photoUri ? (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={flash === 'on'}
          ref={cameraRef}
          onBarcodeScanned={scanned || mode !== 'barcode' ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_e", "upc_a"] }}
        />
      ) : (
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFillObject} />
      )}
      
      <View style={styles.overlay}>
        {/* Header */}
        <Header 
          leftContent={
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <MaterialIcons name="arrow-back" size={28} color="#FFF" />
            </TouchableOpacity>
          }
          title={mode === 'photo' ? 'Analyse IA' : 'Scanner Code-barres'}
          titleStyle={{ color: '#FFF' }}
          transparent
        />

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
            !photoUri && (
              <View style={[styles.targetBox, mode === 'photo' ? styles.targetPhoto : styles.targetBarcode]}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            )
          )}
          {!photoUri && !loading && (
            <Text style={styles.helperText}>
              {mode === 'photo' ? "Centrez votre assiette dans le cadre" : "Alignez le code-barres ici"}
            </Text>
          )}
        </View>

        {/* Bottom Controls */}
        {!photoUri && !loading && (
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
