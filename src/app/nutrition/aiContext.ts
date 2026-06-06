import { supabase } from '../../lib/supabase';

export const fetchAthleteAIContext = async (userId: string) => {
  if (!userId) return null;

  try {
    // 1. Profile (Weight, Height)
    const { data: profile } = await supabase
      .from('profiles')
      .select('weightkg, heightcm')
      .eq('id', userId)
      .maybeSingle();

    // 2. Nutrition Profile
    const { data: nutrition } = await supabase
      .from('nutrition_profiles')
      .select('*')
      .eq('athlete_id', userId)
      .maybeSingle();

    // 3. AI Memory
    const { data: memoryData } = await supabase
      .from('athlete_ai_memory')
      .select('memory_text')
      .eq('athlete_id', userId)
      .order('created_at', { ascending: false });

    // 4. Recent Nutrition Logs (last 3 days to keep context light)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const { data: logs } = await supabase
      .from('nutrition_logs')
      .select('*')
      .eq('athlete_id', userId)
      .gte('date', threeDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // 5. Workouts
    // We need to find what group the user is in, and fetch the workouts for that group.
    let workouts = [];
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('athlete_id', userId);
      
    if (memberships && memberships.length > 0) {
      const groupIds = memberships.map(m => m.group_id);
      
      const today = new Date();
      const tenDaysAhead = new Date();
      tenDaysAhead.setDate(today.getDate() + 10);
      const threeDaysBehind = new Date();
      threeDaysBehind.setDate(today.getDate() - 3);

      const { data: wData } = await supabase
        .from('workouts')
        .select('*')
        .in('group_id', groupIds)
        .gte('date', threeDaysBehind.toISOString().split('T')[0])
        .lte('date', tenDaysAhead.toISOString().split('T')[0])
        .order('date', { ascending: true });
        
      if (wData) workouts = wData;
    }

    return {
      profile,
      nutrition,
      memory: memoryData?.map(m => m.memory_text).join('\n\n') || null,
      nutritionLogs: logs || [],
      workouts: workouts || [],
    };
  } catch (error) {
    console.error("Error fetching athlete AI context:", error);
    return null;
  }
};
