-- Gas Gage Table Migration
-- This migration creates the Gas_Gage table and device_alert_settings table for the device management system

-- Create Gas_Gage table (case-sensitive name to match Supabase table)
CREATE TABLE IF NOT EXISTS public."Gas_Gage" (
  center_id TEXT NOT NULL,
  device_id TEXT PRIMARY KEY,
  model TEXT,
  code_name TEXT,
  serial_number TEXT NOT NULL,
  erp_id TEXT,
  protocol TEXT,
  black INTEGER,
  cyan INTEGER,
  magenta INTEGER,
  yellow INTEGER,
  special_color INTEGER,
  special_color_gage TEXT,
  customer TEXT,
  sales_office TEXT,
  service_office TEXT,
  latest_receive_date TIMESTAMPTZ,
  device_host_name TEXT,
  device_location TEXT,
  toner_replacement_date_black TIMESTAMPTZ,
  toner_replacement_date_cyan TIMESTAMPTZ,
  toner_replacement_date_magenta TIMESTAMPTZ,
  toner_replacement_date_yellow TIMESTAMPTZ,
  toner_replacement_date_special_color TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on serial_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_gas_gage_serial_number ON public."Gas_Gage"(serial_number);

-- Create index on customer for faster sorting
CREATE INDEX IF NOT EXISTS idx_gas_gage_customer ON public."Gas_Gage"(customer);

-- Create device_alert_settings table
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

-- Enable Row Level Security (RLS) for both tables
ALTER TABLE public."Gas_Gage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_alert_settings ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust based on your auth requirements)
-- For Gas_Gage table
CREATE POLICY "Enable read access for all users" ON public."Gas_Gage"
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public."Gas_Gage"
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public."Gas_Gage"
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON public."Gas_Gage"
  FOR DELETE USING (true);

-- For device_alert_settings table
CREATE POLICY "Enable read access for all users" ON public.device_alert_settings
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.device_alert_settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.device_alert_settings
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON public.device_alert_settings
  FOR DELETE USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER set_gas_gage_updated_at
  BEFORE UPDATE ON public."Gas_Gage"
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_device_alert_settings_updated_at
  BEFORE UPDATE ON public.device_alert_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions (adjust based on your needs)
GRANT ALL ON public."Gas_Gage" TO authenticated;
GRANT ALL ON public."Gas_Gage" TO anon;
GRANT ALL ON public.device_alert_settings TO authenticated;
GRANT ALL ON public.device_alert_settings TO anon;
