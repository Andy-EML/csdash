-- Advanced Features Migration
-- Adds support for:
-- 1. Flexible alert configuration (per-toner enable/disable)
-- 2. Order auto-completion detection
-- 3. Offline device monitoring
-- 4. Order lifecycle tracking

-- ============================================
-- 1. Enhance device_alert_settings table
-- ============================================

-- Add alert suppression and detection settings
ALTER TABLE device_alert_settings 
ADD COLUMN IF NOT EXISTS alerts_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS black_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS cyan_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS magenta_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS yellow_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS replacement_detection_threshold integer DEFAULT 70,
ADD COLUMN IF NOT EXISTS offline_alert_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS offline_threshold_hours integer DEFAULT 24;

-- Add comments for documentation
COMMENT ON COLUMN device_alert_settings.alerts_enabled IS 'Master switch for all alerts on this device';
COMMENT ON COLUMN device_alert_settings.black_enabled IS 'Enable/disable black toner alerts';
COMMENT ON COLUMN device_alert_settings.cyan_enabled IS 'Enable/disable cyan toner alerts';
COMMENT ON COLUMN device_alert_settings.magenta_enabled IS 'Enable/disable magenta toner alerts';
COMMENT ON COLUMN device_alert_settings.yellow_enabled IS 'Enable/disable yellow toner alerts';
COMMENT ON COLUMN device_alert_settings.replacement_detection_threshold IS 'Percentage increase needed to auto-complete order (50-90)';
COMMENT ON COLUMN device_alert_settings.offline_alert_enabled IS 'Enable/disable offline detection alerts';
COMMENT ON COLUMN device_alert_settings.offline_threshold_hours IS 'Hours without update before marking offline (default 24)';

-- ============================================
-- 2. Create device_connection_events table
-- ============================================

CREATE TABLE IF NOT EXISTS device_connection_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text,
  serial_number text,
  event_type text NOT NULL CHECK (event_type IN ('went_offline', 'came_online', 'stale_data', 'connection_restored')),
  last_seen_at timestamp,
  detected_at timestamp DEFAULT now(),
  resolved_at timestamp,
  duration_hours integer,
  notes text,
  created_at timestamp DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_connection_events_device_id ON device_connection_events(device_id);
CREATE INDEX IF NOT EXISTS idx_connection_events_serial ON device_connection_events(serial_number);
CREATE INDEX IF NOT EXISTS idx_connection_events_type ON device_connection_events(event_type);
CREATE INDEX IF NOT EXISTS idx_connection_events_resolved ON device_connection_events(resolved_at) WHERE resolved_at IS NULL;

COMMENT ON TABLE device_connection_events IS 'Tracks device connectivity events and offline periods';

-- ============================================
-- 3. Create order_lifecycle_events table
-- ============================================

CREATE TABLE IF NOT EXISTS order_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(order_id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created', 'opened', 'in_progress', 'completed', 'auto_completed', 'cancelled', 'archived')),
  toner_color text,
  toner_level_before integer,
  toner_level_after integer,
  auto_completed boolean DEFAULT false,
  completed_by text,
  notes text,
  detected_at timestamp DEFAULT now(),
  created_at timestamp DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_order_id ON order_lifecycle_events(order_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_type ON order_lifecycle_events(event_type);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_auto ON order_lifecycle_events(auto_completed) WHERE auto_completed = true;

COMMENT ON TABLE order_lifecycle_events IS 'Tracks complete order history including auto-completion events';

-- ============================================
-- 4. Add device status view
-- ============================================

-- Create a view to easily identify offline devices
CREATE OR REPLACE VIEW devices_with_status
WITH (security_invoker = true) AS
SELECT 
  g.*,
  s.alerts_enabled,
  s.offline_alert_enabled,
  s.offline_threshold_hours,
  s.replacement_detection_threshold,
  CASE 
    WHEN g.latest_receive_date IS NULL THEN 'unknown'
    WHEN EXTRACT(EPOCH FROM (NOW() - g.latest_receive_date::timestamp)) / 3600 > COALESCE(s.offline_threshold_hours, 24) * 2 THEN 'lost'
    WHEN EXTRACT(EPOCH FROM (NOW() - g.latest_receive_date::timestamp)) / 3600 > COALESCE(s.offline_threshold_hours, 24) THEN 'offline'
    WHEN EXTRACT(EPOCH FROM (NOW() - g.latest_receive_date::timestamp)) / 3600 > (COALESCE(s.offline_threshold_hours, 24) * 0.75) THEN 'stale'
    ELSE 'online'
  END as connection_status,
  EXTRACT(EPOCH FROM (NOW() - g.latest_receive_date::timestamp)) / 3600 as hours_since_update
FROM "Gas_Gage" g
LEFT JOIN device_alert_settings s ON g.device_id = s.device_id;

COMMENT ON VIEW devices_with_status IS 'Enriched device data with connection status and alert settings';

ALTER TABLE IF EXISTS public.device_connection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_lifecycle_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated select on device_connection_events" ON public.device_connection_events;
DROP POLICY IF EXISTS "Allow authenticated insert on device_connection_events" ON public.device_connection_events;
DROP POLICY IF EXISTS "Allow authenticated update on device_connection_events" ON public.device_connection_events;
DROP POLICY IF EXISTS "Allow authenticated delete on device_connection_events" ON public.device_connection_events;

DROP POLICY IF EXISTS "Allow authenticated select on order_lifecycle_events" ON public.order_lifecycle_events;
DROP POLICY IF EXISTS "Allow authenticated insert on order_lifecycle_events" ON public.order_lifecycle_events;
DROP POLICY IF EXISTS "Allow authenticated update on order_lifecycle_events" ON public.order_lifecycle_events;
DROP POLICY IF EXISTS "Allow authenticated delete on order_lifecycle_events" ON public.order_lifecycle_events;

CREATE POLICY "Allow authenticated select on device_connection_events"
  ON public.device_connection_events FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert on device_connection_events"
  ON public.device_connection_events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update on device_connection_events"
  ON public.device_connection_events FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete on device_connection_events"
  ON public.device_connection_events FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated select on order_lifecycle_events"
  ON public.order_lifecycle_events FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert on order_lifecycle_events"
  ON public.order_lifecycle_events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update on order_lifecycle_events"
  ON public.order_lifecycle_events FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete on order_lifecycle_events"
  ON public.order_lifecycle_events FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================
-- 5. Add helper function for order auto-completion
-- ============================================

-- Function to check if toner level increase warrants auto-completion
CREATE OR REPLACE FUNCTION should_auto_complete_order(
  old_level integer,
  new_level integer,
  threshold integer DEFAULT 70
) RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Null checks
  IF old_level IS NULL OR new_level IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if increase is significant enough
  IF (new_level - old_level) >= threshold THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

COMMENT ON FUNCTION should_auto_complete_order IS 'Determines if toner level increase is significant enough to auto-complete an order';

-- ============================================
-- 6. Grant permissions (adjust as needed)
-- ============================================

-- Grant access to authenticated users (adjust role as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON device_connection_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON order_lifecycle_events TO authenticated;
GRANT SELECT ON devices_with_status TO authenticated;

-- ============================================
-- 7. Sample data for testing (optional)
-- ============================================

-- You can uncomment this to add sample data for testing
/*
-- Example: Mark a device as having alerts disabled
UPDATE device_alert_settings 
SET alerts_enabled = false 
WHERE device_id = 'DEVICE_ID_HERE';

-- Example: Log an offline event
INSERT INTO device_connection_events (device_id, serial_number, event_type, last_seen_at)
VALUES ('DEVICE_ID', 'SERIAL_123', 'went_offline', NOW() - INTERVAL '2 days');

-- Example: Log order auto-completion
INSERT INTO order_lifecycle_events (order_id, event_type, toner_color, toner_level_before, toner_level_after, auto_completed)
VALUES ('ORDER_UUID', 'auto_completed', 'yellow', 8, 95, true);
*/
