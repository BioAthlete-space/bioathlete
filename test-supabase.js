const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vhbwfqqvsudznnfoqyjm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYndmcXF2c3Vkem5uZm9xeWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3OTAxMjEsImV4cCI6MjA5MzM2NjEyMX0.SqmdnHJnRBF7c4n7UCn1gRN2bmmRMaOuFoQ1mVi4Flk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('group_members')
    .select('profiles(id, firstname, lastname)')
    .eq('group_id', '783262c8-56df-4d69-899b-1a52773ae721'); // The user's group id from earlier MCP query
  console.log('Data:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
}

run();
