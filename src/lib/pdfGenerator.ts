import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';
import { Platform } from 'react-native';

export const generateAndShareReport = async (userId: string) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    const { data: memory } = await supabase.from('ai_athlete_memory').select('*').eq('athlete_id', userId).maybeSingle();
    const { data: nutProfile } = await supabase.from('nutrition_profiles').select('*').eq('athlete_id', userId).maybeSingle();

    if (!memory || !memory.baseline_report) {
      throw new Error("Le bilan n'est pas encore terminé.");
    }

    const reportContent = memory.baseline_report.replace(/\n/g, '<br/>');
    
    // Build Activity Table
    let macroTableHtml = '';
    if (memory.macro_targets) {
      macroTableHtml = `
        <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
          <tr style="background-color: #4F46E5; color: white;">
            <th style="padding: 10px; border: 1px solid #ddd;">Activité</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Calories</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Protéines</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Glucides</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Lipides</th>
          </tr>
      `;
      for (const [level, macros] of Object.entries(memory.macro_targets)) {
        const m = macros as any;
        macroTableHtml += `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${level}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${m.calories} kcal</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${m.proteins}g</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${m.carbs}g</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${m.fats}g</td>
          </tr>
        `;
      }
      macroTableHtml += `</table>`;
    }

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1F2937; }
            h1 { color: #4F46E5; font-size: 32px; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px; }
            h2 { color: #111827; font-size: 24px; margin-top: 30px; }
            .header-info { display: flex; justify-content: space-between; background-color: #F3F4F6; padding: 20px; border-radius: 12px; margin-bottom: 30px; }
            .report-box { background-color: #F9FAFB; padding: 25px; border-left: 5px solid #4F46E5; border-radius: 8px; line-height: 1.6; font-size: 16px; }
            .footer { margin-top: 50px; text-align: center; color: #6B7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>Rapport Nutritionnel - Bioflow IA</h1>
          
          <div class="header-info">
            <div>
              <strong>Athlète:</strong> ${profile?.first_name || 'Inconnu'} ${profile?.last_name || ''}<br/>
              <strong>Date du bilan:</strong> ${new Date().toLocaleDateString('fr-FR')}
            </div>
            <div>
              <strong>Poids actuel:</strong> ${profile?.weightkg || '?'} kg<br/>
              <strong>Taille:</strong> ${profile?.heightcm || '?'} cm
            </div>
          </div>

          <h2>Synthèse et Recommandations</h2>
          <div class="report-box">
            ${reportContent}
          </div>

          <h2>Cibles Macroscopiques par Intensité</h2>
          <p>Voici les objectifs exacts calculés par Bioflow pour chaque niveau d'entraînement :</p>
          ${macroTableHtml}

          <div class="footer">
            Généré par BioAthlete App - Ton coach de nutrition sportive
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    
    if (Platform.OS === 'ios') {
      await Sharing.shareAsync(uri);
    } else {
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    }
    
    return true;
  } catch (error) {
    console.error("Error generating PDF:", error);
    return false;
  }
};
