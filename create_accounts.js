const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nmmqkaljsjualnjlzyfw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbXFrYWxqc2p1YWxuamx6eWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTQ3NDEsImV4cCI6MjA5MjI3MDc0MX0.Qy-dSh_1pdFsVGzhOymWM13hZuluAkq4p0pwq7xTTWg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createAccounts() {
  console.log('--- Création du compte Coach ---');
  const { data: coachData, error: coachError } = await supabase.auth.signUp({
    email: 'coach@sprintflow.com',
    password: '123456',
  });

  if (coachError) {
    console.error('Erreur Création Coach Auth:', coachError.message);
  } else {
    console.log('Coach Auth créé avec succès:', coachData.user?.id);
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: coachData.user.id,
      role: 'coach',
      firstName: 'Jean',
      lastName: 'Dupont'
    });
    if (profileError) console.error('Erreur Profile Coach:', profileError.message);
    else console.log('Profile Coach créé avec succès.');
  }

  console.log('\n--- Création du compte Athlète ---');
  const { data: athleteData, error: athleteError } = await supabase.auth.signUp({
    email: 'athlete@sprintflow.com',
    password: '123456',
  });

  if (athleteError) {
    console.error('Erreur Création Athlète Auth:', athleteError.message);
  } else {
    console.log('Athlète Auth créé avec succès:', athleteData.user?.id);
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: athleteData.user.id,
      role: 'athlete',
      firstName: 'Usain',
      mainDiscipline: 'Sprint',
      mesDisciplines: ['100m', '200m']
    });
    if (profileError) console.error('Erreur Profile Athlète:', profileError.message);
    else console.log('Profile Athlète créé avec succès.');
  }
}

createAccounts();
