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
      .from('ai_athlete_memory')
      .select('*')
      .eq('athlete_id', userId)
      .maybeSingle();

    // 4. Recent Nutrition Logs (last 3 days)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const { data: logs } = await supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('log_date', threeDaysAgo.toISOString().split('T')[0])
      .order('log_date', { ascending: false })
      .limit(20);

    // 5. Today's Check-in (CRITICAL for IA context)
    const today = new Date().toISOString().split('T')[0];
    const { data: todayCheckin } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 6. Workouts: 10 past + 10 future (filtered, not full history)
    let workouts = [];
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('athlete_id', userId);
      
    if (memberships && memberships.length > 0) {
      const groupIds = memberships.map(m => m.group_id);
      
      const todayDate = new Date();
      const tenDaysAhead = new Date();
      tenDaysAhead.setDate(todayDate.getDate() + 10);
      const tenDaysBehind = new Date();
      tenDaysBehind.setDate(todayDate.getDate() - 10);

      const { data: wData } = await supabase
        .from('workouts')
        .select('id, title, date, group_id')
        .in('group_id', groupIds)
        .gte('date', tenDaysBehind.toISOString().split('T')[0])
        .lte('date', tenDaysAhead.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(20);
        
      if (wData) workouts = wData;
    }

    // Build pain flag for AI prompt adaptation
    const hasPainToday = todayCheckin?.haspain === true;

    return {
      profile,
      nutrition,
      memory: memoryData || null,
      nutritionLogs: logs || [],
      workouts: workouts || [],
      todayCheckin: todayCheckin || null,
      hasPainToday,
    };
  } catch (error) {
    console.error("Error fetching athlete AI context:", error);
    return null;
  }
};
