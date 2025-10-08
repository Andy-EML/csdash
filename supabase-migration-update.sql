-- Gas Gage Table Migration - UPDATE SCRIPT
-- This script adds missing columns to an existing Gas_Gage table

-- Add serial_number column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'serial_number'
  ) THEN
    ALTER TABLE public."Gas_Gage" ADD COLUMN serial_number TEXT;
  END IF;
END $$;

-- Add other potentially missing columns
DO $$ 
BEGIN 
  -- Add center_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'center_id'
  ) THEN
    ALTER TABLE public."Gas_Gage" ADD COLUMN center_id TEXT;
  END IF;

  -- Add code_name if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'code_name'
  ) THEN
    ALTER TABLE public."Gas_Gage" ADD COLUMN code_name TEXT;
  END IF;

  -- Add erp_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'erp_id'
  ) THEN
    ALTER TABLE public."Gas_Gage" ADD COLUMN erp_id TEXT;
  END IF;

  -- Add protocol if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'protocol'
  ) THEN
    ALTER TABLE public."Gas_Gage" ADD COLUMN protocol TEXT;
  END IF;

  -- Add special_color_gage if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'special_color_gage'
  ) THEN
    ALTER TABLE public."Gas_Gage" ADD COLUMN special_color_gage TEXT;
  END IF;

  -- Add sales_office if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'sales_office'
  ) THEN
    ALTER TABLE public."Gas_Gage" ADD COLUMN sales_office TEXT;
  END IF;

  -- Add service_office if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'service_office'
  ) THEN
    ALTER TABLE public."Gas_Gage" ADD COLUMN service_office TEXT;
  END IF;

  -- Add device_host_name if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'device_host_name'
  ) THEN
    ALTER TABLE public."Gas_Gage" ADD COLUMN device_host_name TEXT;
  END IF;

  -- Add device_location if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'device_location'
  ) THEN
    ALTER TABLE public."Gas_Gage" ADD COLUMN device_location TEXT;
  END IF;

  -- Add toner replacement date columns if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'toner_replacement_date_black'
  ) THEN
    ALTER TABLE public."Gas_Gage" ADD COLUMN toner_replacement_date_black TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'toner_replacement_date_cyan'
  ) THEN
    ALTER TABLE public."Gas_Gage" ADD COLUMN toner_replacement_date_cyan TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'toner_replacement_date_magenta'
  ) THEN
    ALTER TABLE public."Gas_Gage" ADD COLUMN toner_replacement_date_magenta TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'toner_replacement_date_yellow'
  ) THEN
    ALTER TABLE public."Gas_Gage" ADD COLUMN toner_replacement_date_yellow TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'toner_replacement_date_special_color'
  ) THEN
    ALTER TABLE public."Gas_Gage" ADD COLUMN toner_replacement_date_special_color TIMESTAMPTZ;
  END IF;

  -- Add created_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public."Gas_Gage" ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public."Gas_Gage" ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Update serial_number column to match device_id where it's empty
UPDATE public."Gas_Gage" 
SET serial_number = device_id 
WHERE serial_number IS NULL OR serial_number = '';

-- Make serial_number NOT NULL after populating
ALTER TABLE public."Gas_Gage" ALTER COLUMN serial_number SET NOT NULL;

-- Create indexes (drop first if they exist to avoid errors)
DROP INDEX IF EXISTS idx_gas_gage_serial_number;
CREATE INDEX idx_gas_gage_serial_number ON public."Gas_Gage"(serial_number);

DROP INDEX IF EXISTS idx_gas_gage_customer;
CREATE INDEX idx_gas_gage_customer ON public."Gas_Gage"(customer);

-- Create device_alert_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.device_alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL REFERENCES public."Gas_Gage"(device_id) ON DELETE CASCADE,
  black_threshold INTEGER NOT NULL DEFAULT 15 CHECK (black_threshold >= 0 AND black_threshold <= 100),
  cyan_threshold INTEGER NOT NULL DEFAULT 15 CHECK (cyan_threshold >= 0 AND cyan_threshold <= 100),
  magenta_threshold INTEGER NOT NULL DEFAULT 15 CHECK (magenta_threshold >= 0 AND magenta_threshold <= 100),
  yellow_threshold INTEGER NOT NULL DEFAULT 15 CHECK (yellow_threshold >= 0 AND yellow_threshold <= 100),
  special_color_threshold INTEGER CHECK (special_color_threshold IS NULL OR (special_color_threshold >= 0 AND special_color_threshold <= 100)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public."Gas_Gage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_alert_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid duplicates
DROP POLICY IF EXISTS "Enable read access for all users" ON public."Gas_Gage";
DROP POLICY IF EXISTS "Enable insert access for all users" ON public."Gas_Gage";
DROP POLICY IF EXISTS "Enable update access for all users" ON public."Gas_Gage";
DROP POLICY IF EXISTS "Enable delete access for all users" ON public."Gas_Gage";

DROP POLICY IF EXISTS "Enable read access for all users" ON public.device_alert_settings;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.device_alert_settings;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.device_alert_settings;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.device_alert_settings;

-- Create policies for Gas_Gage table
CREATE POLICY "Enable read access for all users" ON public."Gas_Gage"
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public."Gas_Gage"
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public."Gas_Gage"
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON public."Gas_Gage"
  FOR DELETE USING (true);

-- Create policies for device_alert_settings table
CREATE POLICY "Enable read access for all users" ON public.device_alert_settings
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.device_alert_settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.device_alert_settings
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON public.device_alert_settings
  FOR DELETE USING (true);

-- Create or replace function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS set_gas_gage_updated_at ON public."Gas_Gage";
DROP TRIGGER IF EXISTS set_device_alert_settings_updated_at ON public.device_alert_settings;

-- Create triggers
CREATE TRIGGER set_gas_gage_updated_at
  BEFORE UPDATE ON public."Gas_Gage"
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_device_alert_settings_updated_at
  BEFORE UPDATE ON public.device_alert_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT ALL ON public."Gas_Gage" TO authenticated;
GRANT ALL ON public."Gas_Gage" TO anon;
GRANT ALL ON public.device_alert_settings TO authenticated;
GRANT ALL ON public.device_alert_settings TO anon;
