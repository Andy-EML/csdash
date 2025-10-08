-- Migration: Add toner color tracking to orders and customer fields to devices
-- Run this in your Supabase SQL Editor

-- 1. Add toner_color column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS toner_color VARCHAR(20);

-- Valid values: 'black', 'cyan', 'magenta', 'yellow', 'waste_toner'
COMMENT ON COLUMN orders.toner_color IS 'Specific toner color this order is for: black, cyan, magenta, yellow, or waste_toner';

-- 2. Add customer fields to Gas_Gage table (or create device_info table)
ALTER TABLE "Gas_Gage"
ADD COLUMN IF NOT EXISTS customer_site VARCHAR(100),
ADD COLUMN IF NOT EXISTS customer_number VARCHAR(50);

COMMENT ON COLUMN "Gas_Gage".customer_site IS 'Customer site location or branch';
COMMENT ON COLUMN "Gas_Gage".customer_number IS 'Customer account number or ID';

-- 3. Create index for faster querying by toner color
CREATE INDEX IF NOT EXISTS idx_orders_toner_color ON orders(toner_color);
CREATE INDEX IF NOT EXISTS idx_orders_device_toner ON orders(device_id, toner_color, status);

-- 4. Add archived status to orders
-- Check if we need to modify the status enum
DO $$
BEGIN
    -- Add 'archived' to status enum if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'archived'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
    ) THEN
        ALTER TYPE order_status ADD VALUE 'archived';
    END IF;
END $$;

-- 5. Sample query to check orders per toner color per device
-- SELECT device_id, toner_color, status, COUNT(*)
-- FROM orders
-- WHERE status IN ('open', 'in_progress')
-- GROUP BY device_id, toner_color, status;
