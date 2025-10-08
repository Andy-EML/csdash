-- Rename Gas_Gage columns from CSV format to snake_case format
-- This ensures the table columns match what the application code expects

-- Rename columns if they exist with spaces/different casing
DO $$ 
BEGIN 
  -- Rename "Serial Number" to "serial_number"
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Serial Number'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Serial Number" TO serial_number;
  END IF;

  -- Rename "DeviceID" to "device_id"
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'DeviceID'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "DeviceID" TO device_id;
  END IF;

  -- Rename "CenterID" to "center_id"
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'CenterID'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "CenterID" TO center_id;
  END IF;

  -- Rename "Model" to "model" (if it's capitalized)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Model'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'model'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Model" TO model;
  END IF;

  -- Rename "Code Name" to "code_name"
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Code Name'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Code Name" TO code_name;
  END IF;

  -- Rename "ERPID" to "erp_id"
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'ERPID'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "ERPID" TO erp_id;
  END IF;

  -- Rename "Protocol" to "protocol"
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Protocol'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'protocol'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Protocol" TO protocol;
  END IF;

  -- Rename "Black" to "black"
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Black'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'black'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Black" TO black;
  END IF;

  -- Rename "Cyan" to "cyan"
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Cyan'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'cyan'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Cyan" TO cyan;
  END IF;

  -- Rename "Magenta" to "magenta"
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Magenta'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'magenta'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Magenta" TO magenta;
  END IF;

  -- Rename "Yellow" to "yellow"
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Yellow'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'yellow'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Yellow" TO yellow;
  END IF;

  -- Rename "Special Color" to "special_color"
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Special Color'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Special Color" TO special_color;
  END IF;

  -- Rename "Special Color Gage" to "special_color_gage"
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Special Color Gage'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Special Color Gage" TO special_color_gage;
  END IF;

  -- Rename "Customer" to "customer"
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Customer'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'customer'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Customer" TO customer;
  END IF;

  -- Rename "Sales Office" to "sales_office"
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Sales Office'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Sales Office" TO sales_office;
  END IF;

  -- Rename "Service Office" to "service_office"
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Service Office'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Service Office" TO service_office;
  END IF;

  -- Rename "Latest Receive Date" to "latest_receive_date"
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Latest Receive Date'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Latest Receive Date" TO latest_receive_date;
  END IF;

  -- Rename "Device Host Name" to "device_host_name"
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Device Host Name'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Device Host Name" TO device_host_name;
  END IF;

  -- Rename "Device Location" to "device_location"
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Device Location'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Device Location" TO device_location;
  END IF;

  -- Rename toner replacement date columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Toner Replacement Date (Black)'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Toner Replacement Date (Black)" TO toner_replacement_date_black;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Toner Replacement Date (Cyan)'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Toner Replacement Date (Cyan)" TO toner_replacement_date_cyan;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Toner Replacement Date (Magenta)'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Toner Replacement Date (Magenta)" TO toner_replacement_date_magenta;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Toner Replacement Date (Yellow)'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Toner Replacement Date (Yellow)" TO toner_replacement_date_yellow;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND column_name = 'Toner Replacement Date (Special Color)'
  ) THEN
    ALTER TABLE public."Gas_Gage" RENAME COLUMN "Toner Replacement Date (Special Color)" TO toner_replacement_date_special_color;
  END IF;
END $$;

-- Add missing columns that might not exist
DO $$ 
BEGIN 
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

-- Ensure device_id is the primary key
DO $$
BEGIN
  -- Drop existing primary key if it's on the wrong column
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
    AND table_name = 'Gas_Gage' 
    AND constraint_type = 'PRIMARY KEY'
  ) THEN
    -- Check if primary key is already on device_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.key_column_usage
      WHERE table_schema = 'public'
      AND table_name = 'Gas_Gage'
      AND column_name = 'device_id'
      AND constraint_name IN (
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = 'Gas_Gage'
        AND constraint_type = 'PRIMARY KEY'
      )
    ) THEN
      -- Drop the old primary key and create new one on device_id
      ALTER TABLE public."Gas_Gage" DROP CONSTRAINT IF EXISTS "Gas_Gage_pkey";
      ALTER TABLE public."Gas_Gage" ADD PRIMARY KEY (device_id);
    END IF;
  ELSE
    -- No primary key exists, add one on device_id
    ALTER TABLE public."Gas_Gage" ADD PRIMARY KEY (device_id);
  END IF;
END $$;

-- Create indexes
DROP INDEX IF EXISTS idx_gas_gage_serial_number;
CREATE INDEX IF NOT EXISTS idx_gas_gage_serial_number ON public."Gas_Gage"(serial_number);

DROP INDEX IF EXISTS idx_gas_gage_customer;
CREATE INDEX IF NOT EXISTS idx_gas_gage_customer ON public."Gas_Gage"(customer);

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

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Enable read access for all users" ON public."Gas_Gage";
DROP POLICY IF EXISTS "Enable insert access for all users" ON public."Gas_Gage";
DROP POLICY IF EXISTS "Enable update access for all users" ON public."Gas_Gage";
DROP POLICY IF EXISTS "Enable delete access for all users" ON public."Gas_Gage";

CREATE POLICY "Enable read access for all users" ON public."Gas_Gage" FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public."Gas_Gage" FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public."Gas_Gage" FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public."Gas_Gage" FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON public.device_alert_settings;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.device_alert_settings;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.device_alert_settings;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.device_alert_settings;

CREATE POLICY "Enable read access for all users" ON public.device_alert_settings FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.device_alert_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.device_alert_settings FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.device_alert_settings FOR DELETE USING (true);

-- Create or replace trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate triggers
DROP TRIGGER IF EXISTS set_gas_gage_updated_at ON public."Gas_Gage";
CREATE TRIGGER set_gas_gage_updated_at
  BEFORE UPDATE ON public."Gas_Gage"
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_device_alert_settings_updated_at ON public.device_alert_settings;
CREATE TRIGGER set_device_alert_settings_updated_at
  BEFORE UPDATE ON public.device_alert_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT ALL ON public."Gas_Gage" TO authenticated;
GRANT ALL ON public."Gas_Gage" TO anon;
GRANT ALL ON public.device_alert_settings TO authenticated;
GRANT ALL ON public.device_alert_settings TO anon;
