const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const SUPABASE_URL = 'https://vhbwfqqvsudznnfoqyjm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYndmcXF2c3Vkem5uZm9xeWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3OTAxMjEsImV4cCI6MjA5MzM2NjEyMX0.SqmdnHJnRBF7c4n7UCn1gRN2bmmRMaOuFoQ1mVi4Flk';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fonction pour nettoyer les valeurs numériques du CIQUAL
// Les valeurs peuvent être : "1,5", "< 0,2", "-", "Traces"
function parseCiqualNumber(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  let str = val.toString().trim();
  if (str === '-' || str.toLowerCase() === 'traces' || str === '') return 0;
  if (str.startsWith('<')) {
    str = str.replace('<', '').trim();
    // On pourrait garder 0 ou la moitié, on va prendre 0 pour simplifier et éviter les surévaluations
    return 0; 
  }
  str = str.replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

async function run() {
  const filePath = "G:\\Mon Drive\\Flow.pro\\BioAthlete\\Table Ciqual 2025_FR_2025_11_03.xlsx";
  console.log("Lecture du fichier CIQUAL...");
  
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  // Headers are at index 0
  const headers = data[0];
  
  // Trouver les index des colonnes qui nous intéressent
  const colCode = headers.findIndex(h => h && h.includes('alim_code'));
  const colName = headers.findIndex(h => h && h.includes('alim_nom_fr'));
  const colCals = headers.findIndex(h => h && h.includes('Energie, Règlement UE') && h.includes('kcal'));
  const colProts = headers.findIndex(h => h && h.includes('Protéines, N x facteur de Jones'));
  const colCarbs = headers.findIndex(h => h && h.includes('Glucides'));
  const colFats = headers.findIndex(h => h && h.includes('Lipides'));
  
  console.log(`Colonnes identifiées : Code=${colCode}, Nom=${colName}, Cals=${colCals}, Prots=${colProts}, Glucides=${colCarbs}, Lipides=${colFats}`);

  const foodsToInsert = [];
  
  // Skip row 0 (headers)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const code = row[colCode];
    const name = row[colName];
    
    if (!code || !name) continue; // Ligne invalide
    
    const calories = parseCiqualNumber(row[colCals]);
    const proteins = parseCiqualNumber(row[colProts]);
    const carbs = parseCiqualNumber(row[colCarbs]);
    const fats = parseCiqualNumber(row[colFats]);
    
    foodsToInsert.push({
      id: require('crypto').randomUUID(),
      name_fr: name.toString(),
      calories_100g: calories,
      proteins_100g: proteins,
      carbs_100g: carbs,
      fats_100g: fats
    });
  }
  
  console.log(`${foodsToInsert.length} aliments prêts à être insérés.`);
  
  // Insertion par lots (batch) pour ne pas saturer l'API
  const batchSize = 100;
  for (let i = 0; i < foodsToInsert.length; i += batchSize) {
    const batch = foodsToInsert.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('ciqual_foods')
      .insert(batch);
      
    if (error) {
      console.error(`Erreur d'insertion au lot ${i}:`, error);
    } else {
      process.stdout.write(`\rInséré: ${Math.min(i + batchSize, foodsToInsert.length)} / ${foodsToInsert.length}`);
    }
  }
  
  console.log("\nImport terminé !");
}

run().catch(console.error);
