-- Create the coach_groups table
CREATE TABLE IF NOT EXISTS public.coach_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    max_athletes INTEGER NOT NULL DEFAULT 10,
    description TEXT,
    join_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.coach_groups ENABLE ROW LEVEL SECURITY;

-- Policies for coach_groups
-- Coaches can manage (select, insert, update, delete) their own groups
CREATE POLICY "Coaches can manage their own groups" ON public.coach_groups
    FOR ALL
    USING (auth.uid() = coach_id);

-- Athletes can view a group if they know the join_code (We allow public read if they have the code)
-- For now, allow anyone authenticated to view groups, we'll filter by join_code in the app
CREATE POLICY "Authenticated users can view groups" ON public.coach_groups
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Create an athletes_groups relationship table (to link athletes to a group)
CREATE TABLE IF NOT EXISTS public.athlete_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id UUID REFERENCES public.coach_groups(id) ON DELETE CASCADE NOT NULL,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_id, athlete_id)
);

-- Enable RLS
ALTER TABLE public.athlete_groups ENABLE ROW LEVEL SECURITY;

-- Policies for athlete_groups
-- Coaches can view and manage athletes in their groups
CREATE POLICY "Coaches can view athletes in their groups" ON public.athlete_groups
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.coach_groups
            WHERE id = athlete_groups.group_id AND coach_id = auth.uid()
        )
    );

-- Athletes can view and manage their own memberships
CREATE POLICY "Athletes can manage their memberships" ON public.athlete_groups
    FOR ALL
    USING (auth.uid() = athlete_id);
