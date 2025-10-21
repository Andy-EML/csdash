# MPS Dashboard Redesign Implementation Plan

## Overview

This document outlines the complete redesign of the MPS Dashboard based on user requirements for improved UX, better order management, and modern visual design.

## Phase 1: Database & Schema Changes ✅ IN PROGRESS

### Files Created/Modified:

- ✅ `database-migration-orders.sql` - SQL migration for new fields
- ✅ `src/lib/database.types.ts` - Updated TypeScript types

### Changes:

1. **Orders Table:**
   - Add `toner_color` column (black, cyan, magenta, yellow, waste_toner)
   - Add `archived` status to order_status enum
   - Create indexes for faster queries

2. **Gas_Gage Table:**
   - Add `customer_site` field
   - Add `customer_number` field

## Phase 2: Order System Improvements

### 2.1 Create Order Modal Redesign

**File:** `src/components/devices/create-order-modal.tsx` (NEW)

Features:

- Dropdown to select specific toner color
- Support for waste_toner orders
- Better visual design with icons
- Validation to prevent duplicate orders for same toner color

### 2.2 Update Device Detail Page

**File:** `src/app/(dashboard)/devices/[serial]/page.tsx`

Features:

- Show separate order buttons for each toner color
- Display active orders per toner with color-coded badges
- Hide "Create Order" button if order exists for that toner

### 2.3 Smart Dashboard Filtering

**File:** `src/app/(dashboard)/devices/page.tsx`

Logic:

- Device shows in main view IF: toner ≤ threshold AND no active order for that color
- Device shows in Orders tab IF: has active order (any color)
- Archive orders when toner level rises above threshold + 10%

## Phase 3: Visual Design Overhaul

### 3.1 Toner Gauge Improvements

**File:** `src/components/devices/toner-gauge-group.tsx`

Changes:

- Increase gauge width from 60px to 140px
- Increase height from 4px to 10px
- Add percentage labels directly on/next to bars
- Use vibrant, distinct colors:
  - Black: #1F2937
  - Cyan: #06B6D4
  - Magenta: #EC4899
  - Yellow: #F59E0B
  - Waste: #EF4444
- Add tooltips with exact percentage

### 3.2 Device Card Redesign

**File:** `src/components/devices/device-dashboard.tsx`

Changes:

- Increase card spacing (24px gap)
- Add subtle shadows (shadow-md)
- Larger company names (text-lg font-semibold)
- Critical devices get red-tinted background (#FEF2F2)
- Larger status indicator dots (12px diameter, animated pulse)

### 3.3 Color Scheme Update

**File:** `src/app/globals.css`

Changes:

- Move from dark theme to light theme
- Better contrast ratios (WCAG AA compliant)
- Status colors:
  - Critical: #DC2626 with #FEF2F2 background
  - Warning: #F59E0B with #FFFBEB background
  - OK: #10B981 with #F0FDF4 background

### 3.4 Status Badges

**File:** `src/components/ui/badge.tsx` (enhance existing)

Features:

- Larger size (8px padding)
- Color-coded backgrounds
- Icons for different statuses
- Better typography

### 3.5 Action Buttons

**Files:** Device cards, detail pages

Changes:

- Increase button height to 40px
- Add icons to buttons (View 👁️, Settings ⚙️, Order 📦)
- Primary action (Order) uses blue (#2563EB)
- Better hover states with transitions

## Phase 4: Device Settings Enhancements

### File: `src/app/(dashboard)/devices/[serial]/settings/page.tsx`

Add fields:

- Customer Site (text input)
- Customer Number (text input)
- Save to Gas_Gage table

## Phase 5: Performance & UX

### 5.1 Pagination

**File:** `src/components/devices/device-dashboard.tsx`

- Implement virtual scrolling or pagination
- Show 50 devices per page
- Add "Load More" button

### 5.2 Better Loading States

- Add skeleton loaders
- Smooth transitions
- Loading indicators for actions

### 5.3 Keyboard Shortcuts

- `/` - Focus search
- `n` - New order
- `r` - Refresh data

## Implementation Order

### Priority 1 (Core Functionality):

1. Database migration
2. Order modal with toner color selection
3. Smart filtering logic

### Priority 2 (Visual):

4. Toner gauge improvements
5. Color scheme update
6. Device card spacing/shadows

### Priority 3 (Polish):

7. Status badges with icons
8. Button improvements
9. Customer fields in settings

### Priority 4 (Performance):

10. Pagination
11. Loading states
12. Keyboard shortcuts

## Testing Checklist

- [ ] Can create order for specific toner color
- [ ] Can create waste_toner order
- [ ] Cannot create duplicate order for same toner
- [ ] Device disappears from main view when order created
- [ ] Device appears in Orders tab with active order
- [ ] Order archives when toner refilled
- [ ] Customer site/number saves correctly
- [ ] Toner gauges are clearly visible
- [ ] Color scheme has good contrast
- [ ] All buttons are easily clickable (40px height)
- [ ] Mobile responsive design works

## Files to Create/Modify Summary

### New Files:

- `database-migration-orders.sql`
- `src/components/devices/create-order-modal.tsx`
- `REDESIGN_PLAN.md` (this file)

### Files to Modify:

- `src/lib/database.types.ts`
- `src/app/(dashboard)/devices/page.tsx`
- `src/app/(dashboard)/devices/[serial]/page.tsx`
- `src/app/(dashboard)/devices/[serial]/settings/page.tsx`
- `src/components/devices/device-dashboard.tsx`
- `src/components/devices/toner-gauge-group.tsx`
- `src/components/ui/badge.tsx`
- `src/app/globals.css`

## Estimated Time

- Phase 1: 30 min ✅ DONE
- Phase 2: 2 hours
- Phase 3: 2 hours
- Phase 4: 30 min
- Phase 5: 1 hour

**Total: ~6 hours of development work**
