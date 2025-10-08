# Gas Gage Integration - Implementation Guide

This document describes the Gas Gage integration that has been implemented for your device management dashboard.

## Overview

The implementation allows you to:
1. Import device data from CSV files (Gas Gage exports)
2. View devices on a dashboard with real-time toner level monitoring
3. Set custom alert thresholds per device for each toner color
4. Automatically update device data through regular CSV uploads

## Features Implemented

### 1. Database Schema

Two new tables have been added to Supabase:

#### `Gas_Gage` Table
Stores device information imported from CSV files (note: table name is case-sensitive):
- Device identification (CenterID, DeviceID, Serial Number, Model)
- Toner levels (Black, Cyan, Magenta, Yellow, Special Color)
- Customer information (Customer, Sales Office, Service Office)
- Location and tracking data
- Toner replacement dates

#### `device_alert_settings` Table
Stores custom alert thresholds for each device:
- Per-device toner thresholds (0-100%)
- Default: 15% for all colors
- Customizable for each color independently

### 2. CSV Import System

**Location**: `/devices/import`

**Features**:
- Drag-and-drop or file selection interface
- Real-time CSV parsing and validation
- Preview of parsed data before upload
- Batch processing (handles large files)
- Upsert logic (updates existing devices, adds new ones)
- Error handling and reporting

**CSV Format Requirements**:
Required columns:
- CenterID
- DeviceID
- Serial Number
- Model
- Customer
- Black, Cyan, Magenta, Yellow (toner percentages)

Optional columns:
- All other fields from the Gas_Gage export

### 3. Dashboard Integration

**Location**: `/devices`

**Features**:
- Displays devices from Gas_Gage table
- Real-time toner level monitoring
- Status indicators (Critical, Warning, OK)
- Filter by issues, warnings, or waste toner
- Compact/Comfortable/Spacious view modes
- "Import CSV" button for quick access

**Alert Logic**:
- Uses custom thresholds from device_alert_settings table
- Falls back to default 15% threshold if no custom settings
- Generates warnings when toner falls below configured threshold
- Color-coded status badges

### 4. Alert Threshold Settings

**Location**: `/devices/[serial]/settings`

**Features**:
- Configure thresholds per device
- Separate settings for each toner color
- Reset to default (15%) option
- Real-time validation (0-100%)
- Success/error feedback

## Installation Steps

### 1. Database Setup

Run the SQL migration in your Supabase SQL Editor:

```bash
# Copy the contents of supabase-migration.sql
# Paste into Supabase SQL Editor
# Execute
```

This will create:
- `Gas_Gage` table (case-sensitive)
- `device_alert_settings` table
- Indexes for performance
- Row Level Security policies
- Automated triggers

### 2. Dependencies

The required dependencies have already been installed:
- `papaparse` - CSV parsing library
- `@types/papaparse` - TypeScript types

### 3. Test the Implementation

1. **Start the dev server**:
   ```bash
   npm run dev
   ```

2. **Access the import page**:
   Navigate to `http://localhost:3000/devices/import`

3. **Upload your CSV**:
   - Drag and drop your Gas_Gage CSV export
   - Review the parsed data
   - Click "Upload to Database"

4. **View the dashboard**:
   Navigate to `http://localhost:3000/devices`

5. **Configure alert thresholds**:
   - Click "Settings" on any device
   - Adjust thresholds as needed
   - Click "Save Settings"

## File Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── devices/
│   │       ├── page.tsx                    # Main devices page with Gas_Gage integration
│   │       ├── import/
│   │       │   └── page.tsx                # CSV import page
│   │       └── [serial]/
│   │           └── settings/
│   │               └── page.tsx            # Alert settings page
│   └── api/
│       ├── gas-gage/
│       │   └── import/
│       │       └── route.ts                # CSV import API
│       └── device-alert-settings/
│           └── route.ts                    # Alert settings API
├── components/
│   ├── devices/
│   │   ├── csv-upload.tsx                  # CSV upload component
│   │   ├── alert-settings-form.tsx         # Alert settings form
│   │   └── device-dashboard.tsx            # Updated with settings link
│   └── ui/
│       ├── input.tsx                       # Input component (new)
│       └── label.tsx                       # Label component (new)
└── lib/
    └── database.types.ts                   # Updated with Gas_Gage types
```

## Usage Workflow

### Regular CSV Updates

1. Export data from Gas Gage system as CSV
2. Navigate to `/devices/import`
3. Upload the CSV file
4. Review the preview
5. Click "Upload to Database"
6. Data is automatically updated/inserted

### Setting Device-Specific Thresholds

1. Navigate to `/devices`
2. Find the device you want to configure
3. Click "Settings" button
4. Adjust thresholds for each toner color
5. Click "Save Settings"
6. Dashboard will now use custom thresholds for alerts

### Monitoring Devices

1. Navigate to `/devices`
2. View devices grouped by status (Critical, Warning, OK)
3. Use filters to focus on specific issues
4. Click "View" to see detailed device information
5. Click "Settings" to adjust alert thresholds

## API Endpoints

### POST `/api/gas-gage/import`
Imports device data from CSV

**Request Body**:
```json
{
  "data": [
    {
      "CenterID": "GB500",
      "DeviceID": "A93E321000148",
      "Model": "ineo+3350i_Ver20",
      "Serial Number": "A93E321000148",
      "Black": "63",
      "Cyan": "15",
      "Magenta": "100",
      "Yellow": "43",
      "Customer": "Tomlinscote School",
      ...
    }
  ]
}
```

**Response**:
```json
{
  "success": 4,
  "errors": 0
}
```

### POST `/api/device-alert-settings`
Saves alert threshold settings for a device

**Request Body**:
```json
{
  "device_id": "A93E321000148",
  "black_threshold": 20,
  "cyan_threshold": 15,
  "magenta_threshold": 15,
  "yellow_threshold": 15,
  "special_color_threshold": 15
}
```

### GET `/api/device-alert-settings?device_id={deviceId}`
Retrieves alert settings for a device

## Data Mapping

The CSV data is transformed as follows:

| CSV Column | Database Column |
|------------|----------------|
| CenterID | center_id |
| DeviceID | device_id |
| Serial Number | serial_number |
| Model | model |
| Black | black |
| Cyan | cyan |
| Magenta | magenta |
| Yellow | yellow |
| Customer | customer |
| Device Location | device_location |
| Latest Receive Date | latest_receive_date |
| Toner Replacement Date (Black) | toner_replacement_date_black |
| ... | ... |

## Customization Options

### Adjusting Default Threshold
Edit `src/components/devices/alert-settings-form.tsx`:
```typescript
const DEFAULT_THRESHOLD = 15; // Change this value
```

### Modifying Alert Logic
Edit `src/app/(dashboard)/devices/page.tsx` in the device transformation section to adjust how warnings are generated.

### Changing Import Batch Size
Edit `src/app/api/gas-gage/import/route.ts`:
```typescript
const batchSize = 100; // Adjust based on your needs
```

## Troubleshooting

### CSV Upload Issues
- Ensure all required columns are present
- Check that toner values are numbers (0-100)
- Verify date formats are consistent
- Look at browser console for specific errors

### Database Errors
- Verify Supabase connection is working
- Check that tables were created successfully
- Ensure RLS policies are configured
- Verify API keys are correct

### Alert Thresholds Not Working
- Confirm settings were saved (check success message)
- Verify device_id matches between tables
- Check browser console for API errors
- Reload the devices page to see updated thresholds

## Next Steps

Consider implementing:
1. **Automated CSV imports** - Schedule regular imports via cron job
2. **Email notifications** - Alert when devices hit critical thresholds
3. **Historical tracking** - Log toner level changes over time
4. **Bulk threshold settings** - Apply same settings to multiple devices
5. **Export functionality** - Download current device status as CSV
6. **Advanced filtering** - Filter by customer, location, model, etc.

## Support

For issues or questions:
1. Check the browser console for errors
2. Review Supabase logs for backend issues
3. Verify CSV format matches expected structure
4. Ensure all dependencies are installed correctly
