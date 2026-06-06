const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vhbwfqqvsudznnfoqyjm.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYndmcXF2c3Vkem5uZm9xeWptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc5MDEyMSwiZXhwIjoyMDkzMzY2MTIxfQ.16ZuQl0L5DYq_4OHC2nKy3au2dQmzoNeU-uZUtQEEwQ';

const supabase = createClient(supabaseUrl, SUPABASE_SERVICE_KEY);

async function run() {
  const sql = `ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}'::jsonb;`;
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) console.error("Error:", error);
  else console.log("Success:", data);
}
run();
