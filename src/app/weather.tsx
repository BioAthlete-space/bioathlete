import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useThemeColor';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Layout } from '../constants/Layout';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWeather, searchLocation, getTrainingAdvice, WMO_CODES } from '../services/WeatherService';
import { useRouter } from 'expo-router';

export default function WeatherScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [aqiData, setAqiData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [currentLocationName, setCurrentLocationName] = useState('Ma Position');
  
  const [selectedDayIndex, setSelectedDayIndex] = useState(0); // 0 = Aujourd'hui

  useEffect(() => {
    initLocationAndWeather();
  }, []);

  const initLocationAndWeather = async () => {
    setLoading(true);
    try {
      // Regarder si on a une ville sauvegardée
      const savedLocation = await AsyncStorage.getItem('saved_weather_location');
      if (savedLocation) {
        const parsed = JSON.parse(savedLocation);
        setCurrentLocationName(parsed.name);
        await loadWeather(parsed.lat, parsed.lon);
        return;
      }

      // Sinon, GPS
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Impossible de vous localiser. Paris sera utilisé par défaut.', [
          { text: 'OK', onPress: () => loadWeather(48.8566, 2.3522, 'Paris') }
        ]);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      await loadWeather(location.coords.latitude, location.coords.longitude, 'Ma Position (GPS)');
    } catch (e) {
      // Fallback Paris en cas d'erreur (ex: simulateur sans GPS)
      await loadWeather(48.8566, 2.3522, 'Paris');
    }
  };

  const loadWeather = async (lat: number, lon: number, name?: string) => {
    setLoading(true);
    if (name) setCurrentLocationName(name);
    const data = await fetchWeather(lat, lon);
    if (data) {
      setWeatherData(data.weather);
      setAqiData(data.airQuality);
    }
    setLoading(false);
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length > 2) {
      setIsSearching(true);
      const results = await searchLocation(text);
      setSearchResults(results);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const selectCity = async (city: any) => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    
    const name = `${city.name}${city.country ? `, ${city.country}` : ''}`;
    await AsyncStorage.setItem('saved_weather_location', JSON.stringify({ lat: city.latitude, lon: city.longitude, name }));
    await loadWeather(city.latitude, city.longitude, name);
    setSelectedDayIndex(0);
  };

  const useGPS = async () => {
    setLoading(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      let location = await Location.getCurrentPositionAsync({});
      await AsyncStorage.removeItem('saved_weather_location'); // Reset custom save
      await loadWeather(location.coords.latitude, location.coords.longitude, 'Ma Position (GPS)');
    }
    setLoading(false);
  };

  if (loading && !weatherData) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.text, marginTop: 10 }}>Analyse du climat...</Text>
      </View>
    );
  }

  // --- PREPARATION DES DONNEES ---
  const daily = weatherData?.daily;
  const days = daily?.time || [];
  
  // Données du jour sélectionné
  let t = 20, apparentT = 20, code = 0, wind = 10, uv = 5, aqi = 50;

  if (selectedDayIndex === 0 && weatherData?.current) {
    // Current day, current hour
    t = weatherData.current.temperature_2m;
    apparentT = weatherData.current.apparent_temperature;
    code = weatherData.current.weathercode;
    wind = weatherData.current.windspeed_10m;
    // UV/AQI current might be hourly, let's use the current hour index or daily max
    uv = daily?.uv_index_max?.[0] || 5;
    aqi = aqiData?.current?.european_aqi || 50;
  } else if (daily) {
    // Future days
    t = daily.temperature_2m_max[selectedDayIndex];
    apparentT = daily.apparent_temperature_max[selectedDayIndex];
    code = daily.weathercode[selectedDayIndex];
    wind = daily.windspeed_10m_max[selectedDayIndex];
    uv = daily.uv_index_max[selectedDayIndex];
    // We don't always have aqi for future 7 days easily, use 50 (good) by default
    aqi = 50; 
  }

  const advice = getTrainingAdvice(t, apparentT, code, wind, uv, aqi);
  const wmo = WMO_CODES[code] || WMO_CODES[0];

  const getAqiColor = (val: number) => {
    if (val <= 50) return '#10B981'; // Vert
    if (val <= 100) return '#F59E0B'; // Jaune/Orange
    if (val <= 150) return '#F97316'; // Orange foncé
    return '#EF4444'; // Rouge
  };
  const getAqiLabel = (val: number) => {
    if (val <= 50) return 'Bon';
    if (val <= 100) return 'Moyen';
    if (val <= 150) return 'Dégradé';
    return 'Mauvais';
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.container, { backgroundColor: theme.background }]}>
      <Header 
        leftContent={
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', marginLeft: 10 }}>Météo & Entraînement</Text>
          </TouchableOpacity>
        }
      />
      
      {/* Search Bar */}
      <View style={{ paddingHorizontal: 20, zIndex: 10 }}>
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <MaterialIcons name="search" size={20} color={theme.icon} />
          <TextInput 
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Rechercher une ville..."
            placeholderTextColor={theme.icon}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity onPress={useGPS}>
             <MaterialIcons name="my-location" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {isSearching && searchResults.length > 0 && (
          <View style={[styles.searchResults, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {searchResults.map((res, i) => (
                <TouchableOpacity key={i} style={[styles.resultItem, { borderBottomColor: theme.border }]} onPress={() => selectCity(res)}>
                  <Text style={{ color: theme.text, fontWeight: 'bold' }}>{res.name}</Text>
                  <Text style={{ color: theme.icon, fontSize: 12 }}>{res.admin1 ? `${res.admin1}, ` : ''}{res.country}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Ville Actuelle */}
        <View style={styles.locationHeader}>
          <MaterialIcons name="location-on" size={20} color={theme.primary} />
          <Text style={[styles.locationText, { color: theme.text }]}>{currentLocationName}</Text>
        </View>

        {/* Jours Carousel */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll} style={{ marginHorizontal: -20, marginBottom: 20 }}>
          {days.map((dateStr: string, index: number) => {
            const date = new Date(dateStr);
            const isSelected = index === selectedDayIndex;
            const dName = index === 0 ? "Auj." : index === 1 ? "Dem." : date.toLocaleDateString('fr-FR', { weekday: 'short' });
            return (
              <TouchableOpacity 
                key={dateStr} 
                style={[styles.dayCard, { 
                  backgroundColor: isSelected ? theme.primary : theme.card,
                  borderColor: isSelected ? theme.primary : theme.border
                }]}
                onPress={() => setSelectedDayIndex(index)}
              >
                <Text style={[styles.dayName, { color: isSelected ? '#FFF' : theme.icon }]}>{dName}</Text>
                <Text style={{ fontSize: 24 }}>{WMO_CODES[daily.weathercode[index]]?.icon || '🌤'}</Text>
                <Text style={[styles.dayTemp, { color: isSelected ? '#FFF' : theme.text }]}>
                  {Math.round(daily.temperature_2m_max[index])}°
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Détails du jour sélectionné */}
        <Card style={[styles.mainWeatherCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
           <Text style={styles.mainIcon}>{wmo.icon}</Text>
           <Text style={[styles.mainTemp, { color: theme.text }]}>{Math.round(t)}°C</Text>
           <Text style={[styles.mainDesc, { color: theme.icon }]}>{wmo.label}</Text>
           
           <View style={styles.statsRow}>
             <View style={styles.statItem}>
               <MaterialIcons name="thermostat" size={20} color={theme.icon} />
               <Text style={[styles.statValue, { color: theme.text }]}>{Math.round(apparentT)}°C</Text>
               <Text style={[styles.statLabel, { color: theme.icon }]}>Ressenti</Text>
             </View>
             <View style={styles.statItem}>
               <MaterialIcons name="air" size={20} color={theme.icon} />
               <Text style={[styles.statValue, { color: theme.text }]}>{Math.round(wind)}</Text>
               <Text style={[styles.statLabel, { color: theme.icon }]}>km/h</Text>
             </View>
             <View style={styles.statItem}>
               <MaterialIcons name="wb-sunny" size={20} color={theme.icon} />
               <Text style={[styles.statValue, { color: theme.text }]}>{uv}</Text>
               <Text style={[styles.statLabel, { color: theme.icon }]}>UV</Text>
             </View>
             <View style={styles.statItem}>
               <MaterialIcons name="eco" size={20} color={getAqiColor(aqi)} />
               <Text style={[styles.statValue, { color: theme.text }]}>{aqi}</Text>
               <Text style={[styles.statLabel, { color: getAqiColor(aqi) }]}>{getAqiLabel(aqi)}</Text>
             </View>
           </View>
        </Card>

        {/* --- CONSEILS ALGORITHMIQUES --- */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Conseils d'Entraînement</Text>

        {/* Avertissements (Warnings) */}
        {advice.warnings.length > 0 && (
          <Card style={[styles.adviceCard, { backgroundColor: '#EF4444' + '15', borderColor: '#EF4444' + '40' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <MaterialIcons name="warning" size={20} color="#EF4444" />
              <Text style={[styles.adviceTitle, { color: '#EF4444' }]}>Vigilance</Text>
            </View>
            {advice.warnings.map((w, i) => (
              <Text key={i} style={[styles.adviceText, { color: theme.text }]}>• {w}</Text>
            ))}
          </Card>
        )}

        {/* Tenue (Clothing) */}
        {advice.clothing.length > 0 && (
          <Card style={[styles.adviceCard, { backgroundColor: theme.primary + '10', borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <MaterialIcons name="checkroom" size={20} color={theme.primary} />
              <Text style={[styles.adviceTitle, { color: theme.primary }]}>Tenue Recommandée</Text>
            </View>
            {advice.clothing.map((c, i) => (
              <Text key={i} style={[styles.adviceText, { color: theme.text }]}>• {c}</Text>
            ))}
          </Card>
        )}

        {/* Hydratation (Hydration) */}
        {advice.hydration.length > 0 && (
          <Card style={[styles.adviceCard, { backgroundColor: '#3B82F6' + '10', borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <MaterialIcons name="water-drop" size={20} color="#3B82F6" />
              <Text style={[styles.adviceTitle, { color: '#3B82F6' }]}>Hydratation</Text>
            </View>
            {advice.hydration.map((h, i) => (
              <Text key={i} style={[styles.adviceText, { color: theme.text }]}>• {h}</Text>
            ))}
          </Card>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginVertical: 10 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  searchResults: { position: 'absolute', top: 60, left: 20, right: 20, borderRadius: 12, borderWidth: 1, maxHeight: 200, zIndex: 20, elevation: 5 },
  resultItem: { padding: 12, borderBottomWidth: 1 },
  
  content: { padding: 20, paddingTop: 10 },
  locationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, justifyContent: 'center' },
  locationText: { fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  
  daysScroll: { paddingHorizontal: 20, gap: 10 },
  dayCard: { width: 70, paddingVertical: 15, alignItems: 'center', borderRadius: 16, borderWidth: 1, marginRight: 10 },
  dayName: { fontSize: 14, fontWeight: '600', marginBottom: 5 },
  dayTemp: { fontSize: 16, fontWeight: 'bold', marginTop: 5 },
  
  mainWeatherCard: { alignItems: 'center', padding: 25, borderRadius: 24, marginBottom: 20 },
  mainIcon: { fontSize: 80, marginBottom: 10 },
  mainTemp: { fontSize: 48, fontWeight: 'bold', marginBottom: 5 },
  mainDesc: { fontSize: 18, fontWeight: '600', marginBottom: 20 },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', borderTopWidth: 1, borderTopColor: '#00000015', paddingTop: 20 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', marginTop: 5 },
  statLabel: { fontSize: 12, marginTop: 2 },
  
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
  adviceCard: { padding: 15, borderRadius: 16, borderWidth: 1, marginBottom: 15 },
  adviceTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  adviceText: { fontSize: 14, marginBottom: 4, lineHeight: 20 }
});
