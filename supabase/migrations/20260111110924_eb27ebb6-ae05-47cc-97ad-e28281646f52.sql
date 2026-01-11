-- Add 'column' to the calculation_type enum
ALTER TYPE public.calculation_type ADD VALUE IF NOT EXISTS 'column';