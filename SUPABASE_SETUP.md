# Supabase Setup & Optimization

## Required Configuration

### 1. Site URL Configuration (Fix Password Reset)

In your Supabase Dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your production domain: `https://your-app.vercel.app`
3. Add to **Redirect URLs**:
   - `https://your-app.vercel.app/reset-password`
   - `http://localhost:3000/reset-password` (for local development)

**Important**: Replace `your-app.vercel.app` with your actual Vercel domain.

The password reset flow:

1. User clicks "Forgot Password" on login page
2. User enters email on `/forgot-password`
3. Supabase sends email with magic link
4. Link redirects to `/reset-password` where user sets new password
5. User is redirected to `/login` after success

### 2. Performance Optimization - Database Indexes

Run these SQL commands in your Supabase SQL Editor to improve query performance:

```sql
-- Index for Gas_Gage table (main device data)
CREATE INDEX IF NOT EXISTS idx_gas_gage_customer ON "Gas_Gage"(customer);
CREATE INDEX IF NOT EXISTS idx_gas_gage_device_id ON "Gas_Gage"(device_id);
CREATE INDEX IF NOT EXISTS idx_gas_gage_serial ON "Gas_Gage"(serial_number);
CREATE INDEX IF NOT EXISTS idx_gas_gage_updated_at ON "Gas_Gage"(updated_at DESC);

-- Index for orders table
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_device_id ON orders(device_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Index for device_alert_settings
CREATE INDEX IF NOT EXISTS idx_alert_settings_device_id ON device_alert_settings(device_id);
```

### 3. Row Level Security (RLS)

Ensure RLS policies are configured for your tables:

```sql
-- Enable RLS on tables
ALTER TABLE "Gas_Gage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_alert_settings ENABLE ROW LEVEL SECURITY;

-- Example policy: Allow authenticated users to read all data
CREATE POLICY "Allow authenticated read access" ON "Gas_Gage"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read/write access" ON device_alert_settings
  FOR ALL TO authenticated USING (true);
```

## Performance Tuning

### Current Optimizations Applied:

- ✅ Page-level caching with 60-second revalidation
- ✅ Removed unnecessary `force-dynamic` rendering
- ✅ Parallel data fetching with `Promise.all()`

### Recommended:

- Add indexes (SQL above) for faster queries
- Consider using Supabase Edge Functions for complex operations
- Use `select()` to fetch only needed columns
- Implement pagination for large datasets

## Environment Variables

Required in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key

These are intentionally public and safe to embed in client-side code.

## Device Data Warehouse Migration

To enable CSV imports for toner levels, meter readings, warning history, and consumable events:

1. Open the Supabase SQL editor.
2. Run the statements in `supabase-device-enhancements.sql`. The script:
   - Extends the existing `devices` table with `device_id`, `center_id`, `last_seen_at`, and other dashboard fields.
   - Creates the `device_toner_snapshots`, `device_meter_readings`, `device_warning_events`, `device_consumable_events`, and `import_jobs` tables.
   - Publishes helper views (`device_current_toner`, `device_status`) for the dashboard.
3. If you already have duplicate `serial_number` or `device_id` values, resolve them before re-running the block that adds uniqueness constraints (the script will warn and skip the constraint when duplicates exist).

After the migration, wire the CSV ingestion API to populate the new tables so the dashboard can surface low toner, waste bin levels, meter trends, and offline devices.
