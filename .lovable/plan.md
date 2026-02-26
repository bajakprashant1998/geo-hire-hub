

# Enhance Map View, Lazy Loading & Card Designs

## Overview
Three-part enhancement: (1) lazy-load the Google Maps script so it only initializes when the map section is visible, (2) improve the map popup card designs for jobs and candidates with richer visuals, and (3) enhance the mobile MarkerPreviewSheet with better navigation and information hierarchy.

---

## Technical Details

### 1. Lazy Load Google Maps (`src/components/map/GoogleMapContainer.tsx`)

Currently the Google Maps `useJsApiLoader` runs immediately on mount, downloading ~200KB of scripts even before the user sees the map. We will wrap the inner map component with an `IntersectionObserver`-based visibility gate:

- Add a `useInView` wrapper using `useRef` + `IntersectionObserver` inside `GoogleMapContainer`
- Only render `GoogleMapInner` (which calls `useJsApiLoader`) once the container div is in viewport
- Show a lightweight placeholder (skeleton with map icon) until visible
- This prevents the Google Maps JS SDK from loading until the user actually scrolls to or views the map area

**Changes in `GoogleMapContainer.tsx`:**
- Add `useInView` state + `IntersectionObserver` ref in the outer `GoogleMapContainer` wrapper component (~lines 540-592)
- Render a placeholder div with `ref` until `isInView` is true, then render `GoogleMapsLoaderBoundary > GoogleMapInner`

### 2. Enhanced Job Popup Card (InfoWindow in `GoogleMapContainer.tsx`)

Redesign the job hover card (InfoWindow content, ~lines 440-530) with:
- **Company logo/initial avatar** instead of generic briefcase icon
- **Verified employer badge** with checkmark
- **Skill tags** (first 3 from job description keywords)
- **"NEW" badge** with animation pulse for jobs < 24h old
- **Urgency indicator** ("Actively Hiring" strip)
- **Better salary formatting** with ₹ symbol and "/month" suffix
- **Distance** with walking/driving icon
- **Cleaner action buttons** with gradient backgrounds and hover effects

### 3. Enhanced Candidate Popup Card (InfoWindow in `GoogleMapContainer.tsx`)

Redesign the candidate hover card (~lines 334-438) with:
- **Larger avatar** with status ring (online/offline)
- **Experience bar** visual indicator
- **Top 3 skills** shown as mini badges
- **Location city name** instead of just km distance
- **Profile completeness indicator** (small progress ring)
- **Better CTA buttons** with consistent styling

### 4. Enhanced MarkerPreviewSheet (Mobile Bottom Sheet) (`src/components/map/MarkerPreviewSheet.tsx`)

Complete redesign of the mobile preview sheet:
- **Job preview**: Add company logo placeholder, gradient header bar, skill tags, "Quick Apply" button, share button, salary comparison hint
- **Candidate preview**: Add profile strength ring, availability status badge, top skills with match indicators, quick actions row (Message, Save, Share)
- **Navigation improvements**: Add swipe-to-dismiss hint, "View on Map" button that centers the map, breadcrumb-style navigation showing "Map > Job Detail"
- **Better visual hierarchy**: Use card sections with subtle dividers, icon badges for metadata

### 5. Map Loading Skeleton Enhancement (`src/components/map/MapLoadingSkeleton.tsx`)

- Add animated map pin markers that "drop in" during loading
- Show a blurred placeholder map image background
- Add progress text: "Finding jobs near you..." / "Locating candidates..."

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/map/GoogleMapContainer.tsx` | Add IntersectionObserver lazy loading, enhanced InfoWindow card designs for both jobs and candidates |
| `src/components/map/MarkerPreviewSheet.tsx` | Complete redesign with better navigation, richer cards, share/save actions |
| `src/components/map/MapLoadingSkeleton.tsx` | Enhanced loading animation with mode-aware text |

## Files NOT Changed
- No database changes
- No new dependencies (IntersectionObserver is native browser API)
- No changes to data fetching logic

