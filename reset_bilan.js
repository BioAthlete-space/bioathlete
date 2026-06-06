const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vhbwfqqvsudznnfoqyjm.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYndmcXF2c3Vkem5uZm9xeWptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc5MDEyMSwiZXhwIjoyMDkzMzY2MTIxfQ.16ZuQl0L5DYq_4OHC2nKy3au2dQmzoNeU-uZUtQEEwQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error(error);
    return;
  }
  const user = users.users.find(u => u.email === 'kleveensv@gmail.com');
  if (!user) {
    console.log("User not found");
    return;
  }

  const { error: updErr } = await supabase.from('nutrition_profiles')
    .update({ is_bilan_done: false })
    .eq('athlete_id', user.id);

  if (updErr) {
    console.error("Update error:", updErr);
  } else {
    console.log("Bilan reset for user:", user.id);
  }
}
run();
