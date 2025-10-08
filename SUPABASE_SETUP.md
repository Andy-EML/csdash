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
