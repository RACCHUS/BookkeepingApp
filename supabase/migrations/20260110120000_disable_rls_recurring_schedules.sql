-- Migration: Disable RLS on recurring_schedules table for Firebase Auth
-- This table was missed in the previous RLS disable migration

ALTER TABLE IF EXISTS public.recurring_schedules DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recurring_schedules') THEN
        DROP POLICY IF EXISTS "Users can view own recurring schedules" ON public.recurring_schedules;
        DROP POLICY IF EXISTS "Users can insert own recurring schedules" ON public.recurring_schedules;
        DROP POLICY IF EXISTS "Users can update own recurring schedules" ON public.recurring_schedules;
        DROP POLICY IF EXISTS "Users can delete own recurring schedules" ON public.recurring_schedules;
    END IF;
END $$;
