-- Fix RLS policies for calculations table
-- The issue is using RESTRICTIVE policies - they require ALL to pass
-- We need PERMISSIVE policies where ANY can pass

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own calculations" ON public.calculations;
DROP POLICY IF EXISTS "Admins can view all favorite calculations" ON public.calculations;
DROP POLICY IF EXISTS "Users can insert their own calculations" ON public.calculations;
DROP POLICY IF EXISTS "Users can update their own calculations" ON public.calculations;
DROP POLICY IF EXISTS "Users can delete their own calculations" ON public.calculations;

-- Create PERMISSIVE policies (default) for SELECT
CREATE POLICY "Users can view their own calculations" 
ON public.calculations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all favorite calculations" 
ON public.calculations 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) AND is_favorite = true);

-- Create PERMISSIVE policies for INSERT, UPDATE, DELETE
CREATE POLICY "Users can insert their own calculations" 
ON public.calculations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calculations" 
ON public.calculations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calculations" 
ON public.calculations 
FOR DELETE 
USING (auth.uid() = user_id);