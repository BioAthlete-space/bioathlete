import { supabase } from '../../lib/supabase';

export async function fetchAIContext(userId: string, groupId: string | null) {
  if (!userId) return null;

  try {
    const promises = [
      supabase.from('coach_ai_memory').select('memory_text').eq('coach_id', userId)
    ];

    if (groupId) {
      promises.push(
        supabase.from('group_members').select('profiles:athlete_id(id, firstname, lastname, gender, birthdate)').eq('group_id', groupId),
        supabase.from('workouts').select('title, type, date, status, duration_minutes').eq('group_id', groupId).order('date', { ascending: false }).limit(30),
        supabase.from('coach_periodizations').select('name, start_date, end_date').eq('group_id', groupId),
        supabase.from('coach_subgroups').select('id, name, created_at').eq('group_id', groupId)
      );
    }

    const results = await Promise.all(promises);
    
    const memoryData = results[0].data || [];
    const memoryText = memoryData.map((m: any) => m.memory_text).join('\\n');

    let athletes = [];
    let workouts = [];
    let periodizations = [];
    let subgroups: any[] = [];

    if (groupId) {
      athletes = (results[1]?.data || []).map((row: any) => row.profiles).filter(Boolean);
      workouts = results[2]?.data || [];
      periodizations = results[3]?.data || [];
      subgroups = results[4]?.data || [];
      
      // Fetch subgroup memberships if there are subgroups
      if (subgroups.length > 0) {
        const { data: memData } = await supabase
          .from('subgroup_members')
          .select('subgroup_id, athlete_id')
          .in('subgroup_id', subgroups.map(g => g.id));
          
        if (memData) {
          subgroups = subgroups.map(sg => ({
            ...sg,
            members: memData.filter(m => m.subgroup_id === sg.id).map(m => m.athlete_id)
          }));
        }
      }
    }

    return {
      memory: memoryText,
      athletes,
      workouts,
      periodizations,
      subgroups
    };
  } catch (error) {
    console.error("Erreur lors de la récupération du contexte IA:", error);
    return null;
  }
}
