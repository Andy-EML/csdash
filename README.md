# MPS Dashboard

A modern Managed Print Services (MPS) dashboard built with Next.js 15, providing real-time device insights and toner level monitoring for printer fleets.

## Features

- Real-time device monitoring with live toner telemetry
- Visual status indicators highlighting critical, warning, and healthy devices
- Supply order management directly from the dashboard
- Advanced filtering across customer, model, serial number, and status
- Dark mode support with theme switching
- Optimized performance via virtual scrolling for large fleets
- Responsive design that adapts to desktop, tablet, and mobile

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **UI Components**: Radix UI primitives
- **Charts**: Recharts
- **State Management**: React hooks

## Prerequisites

- Node.js 20+ installed
- A Supabase account and project
- npm or yarn package manager

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Andy-EML/csdash.git
cd csdash
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and add your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase project details:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 4. Set Up the Database

Run the SQL migrations in your Supabase SQL editor to create the required tables:

1. `supabase-migration.sql` - Creates core tables (devices, orders, Gas_Gage)
2. `supabase-device-enhancements.sql` - Adds device settings and warning overrides
3. `supabase-warning-overrides.sql` - Configures warning dismissal features
4. `database-migration-orders.sql` - Sets up order management tables

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the dashboard.

## Project Structure

```
src/
  app/                     # Next.js App Router pages
    (auth)/                # Authentication flows
    (dashboard)/           # Dashboard pages (devices, orders, analytics)
    api/                   # Route handlers
  components/              # React components
    auth/                  # Authentication components
    devices/               # Device-related components
    navigation/            # Navigation components
    orders/                # Order management components
    providers/             # Context providers
    ui/                    # Reusable UI components
  lib/                     # Utility functions and configurations
    csv/                   # CSV import utilities
    supabase/              # Supabase client wrappers
    database.types.ts      # Supabase-generated types
    utils.ts               # Shared helpers
public/                    # Static assets
scripts/                   # Utility scripts
CSV-REF/                   # Reference CSV files
```

## Key Features Explained

### Device Dashboard

The main dashboard (`/devices`) displays all monitored devices with:

- Color-coded status indicators (Critical/Warning/OK)
- Toner level visualization for Black, Cyan, Magenta, Yellow
- Quick action buttons for creating supply orders
- Warning dismissal for non-critical alerts

### CSV Import

Import device data from CSV files (`/devices/import`):

- Supports standard Gas Gage report format
- Automatically updates device toner levels
- Validates data before import

### Order Management

Track supply orders (`/orders`):

- Create toner replacement orders
- Monitor order status (Open, In Progress, Completed)
- Link orders to specific devices

### Alert Settings

Configure custom thresholds per device (`/devices/[serial]/settings`):

- Set custom low-toner thresholds
- Override default warning levels
- Device-specific alert configurations

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Code Style

This project uses:

- ESLint for code quality
- TypeScript for type safety
- Tailwind CSS for styling

## Database Schema

### Main Tables

- **Gas_Gage** - Raw device telemetry data (toner levels, serial numbers)
- **devices** - Normalized device information
- **orders** - Supply order tracking
- **device_alert_settings** - Custom threshold configurations
- **device_warning_overrides** - Warning dismissal records

## Deployment

### Deploy to Vercel

The easiest way to deploy is using the [Vercel Platform](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Andy-EML/csdash)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel project settings
4. Deploy

### Deploy to Netlify

Alternatively, deploy to Netlify:

1. Connect your GitHub repository
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
3. Add environment variables
4. Deploy

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is private and proprietary.

## Support

For issues or questions, please open an issue on the GitHub repository.
