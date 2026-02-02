
# Home Page UI/UX Redesign Plan

## Reference Analysis

Based on the provided reference image, the new design features a **clean, consolidated left sidebar** layout instead of the current scattered floating controls approach. Key design elements include:

### Reference Design Elements
1. **Logo + Location Badge**: "Hire for Job" with green pulsing location indicator showing city name
2. **Mode Toggle**: Two buttons "I am Hiring" (outline) and "I need a Job" (filled red/coral) in a horizontal row
3. **Auth Buttons Row**: "Sign In" (with arrow icon) and "Get Started" (filled blue) side by side
4. **Search Bar**: Simple search with placeholder text and location/GPS icon on right
5. **Search Radius Section**: 
   - Header with target icon "Search Radius"
   - Quick preset buttons (5, 10, 25, 50, 100) in a row
   - Slider below with "5 km", current value badge, "100 km" labels
6. **Stats Card**: 
   - Red briefcase icon with "2 jobs nearby" 
   - "within 50km of your location" subtitle
   - Category breakdown badges (Private, Govt)
   - "View List" button at bottom
7. **Full-screen satellite map**: Takes up the entire right side
8. **Navigation button**: Bottom-right corner for centering on user location
9. **Map markers**: Red circular markers with briefcase icon, green user location dot, red radius circle

---

## Implementation Plan

### Phase 1: Create New Left Sidebar Panel Component

**New File: `src/components/map/LeftSidebarPanel.tsx`**

A consolidated sidebar panel that contains all controls in a vertical layout:

```
+----------------------------------+
| [≡] [Logo] Hire for Job          |
|     ● Ahmedabad                  |
+----------------------------------+
| [I am Hiring] [I need a Job]     |
+----------------------------------+
| [→ Sign In]  [✦ Get Started]     |
+----------------------------------+
| 🔍 Search jobs by title, company |
|                           [📍]   |
+----------------------------------+
| ⊕ Search Radius                  |
| [5] [10] [25] [50] [100]         |
| ○────────●──────────○            |
| 5 km      [50 km]      100 km    |
+----------------------------------+
| 📦 2 jobs nearby                 |
|    within 50km of your location  |
|    [👤 2 Private] [🏛 0 Govt]    |
|    [≡ View List]                 |
+----------------------------------+
```

**Features:**
- White background with subtle shadow
- Fixed width (~280px) on desktop
- Stacked card sections with consistent spacing
- Rounded corners on each section card

---

### Phase 2: Update Index.tsx Layout

**File: `src/pages/Index.tsx`**

Change from floating overlay architecture to a side-by-side layout:

**Current Layout:**
- Full-screen map with floating header and controls

**New Layout:**
- Left sidebar (fixed width, 280-300px) containing all controls
- Right side: Full-screen map (remaining width)
- Mobile: Bottom sheet approach (keep existing StatsBottomSheet)

```
+---------------------------+----------------------------------------+
|                           |                                        |
|   Left Sidebar Panel      |           Map Container                |
|   (All controls)          |         (Full width/height)            |
|                           |                                        |
|   - Logo + Location       |       [Markers + Radius Circle]        |
|   - Mode Toggle           |                                        |
|   - Auth Buttons          |                                        |
|   - Search Bar            |                                        |
|   - Radius Filter         |                                        |
|   - Stats Card            |                                        |
|                           |                             [⇢ Nav]    |
+---------------------------+----------------------------------------+
```

---

### Phase 3: Component Style Updates

#### 3.1 Mode Toggle Redesign
Update `src/components/map/ViewToggle.tsx`:
- Remove glass-morphism background
- White background with border
- "I am Hiring" = outline style with gray text
- "I need a Job" = filled coral/red background with white text
- Both have icons (Users, Briefcase)

#### 3.2 Auth Buttons Row
In new LeftSidebarPanel:
- "Sign In" button: outline style with arrow icon, gray text
- "Get Started" button: filled primary blue with sparkle/plus icon

#### 3.3 Search Bar Simplification
Update `src/components/map/SearchBar.tsx`:
- Simple white background with subtle border
- Search icon on left
- GPS/location icon on right
- Remove voice search button for cleaner look

#### 3.4 Radius Filter Card
Update `src/components/map/RadiusFilter.tsx`:
- White card background (no glass-morphism)
- Target icon with "Search Radius" header
- 5 preset buttons in a horizontal row
- Slider below with min/current/max labels
- Current value shown in blue highlighted badge

#### 3.5 Stats Card
New component in LeftSidebarPanel:
- Briefcase icon (red for jobs mode, blue for hiring mode)
- Large count number with "jobs nearby" text
- Subtitle "within Xkm of your location"
- Category breakdown badges (Private count, Govt count)
- "View List" button with list icon

---

### Phase 4: Map Container Updates

**File: `src/components/map/MapContainer.tsx`**

- Ensure map takes full height and remaining width
- Keep navigation/center button in bottom-right corner
- Keep marker styling (red circles with briefcase, green user dot)
- Keep radius circle visualization

---

### Phase 5: Mobile Responsiveness

**On mobile (< 768px):**
- Hide left sidebar completely
- Show simplified header with logo + mode toggle
- Use existing StatsBottomSheet for stats and radius controls
- Keep MobileFAB for quick actions
- Keep BottomNavBar for navigation

---

### Phase 6: Hide Unused Components on Desktop

- Remove floating FloatingControls on desktop (integrated into sidebar)
- Remove floating Header on desktop (integrated into sidebar)
- Keep MapLegend removed from desktop (not in reference)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/map/LeftSidebarPanel.tsx` | **NEW** - Consolidated sidebar with all controls |
| `src/pages/Index.tsx` | Switch to sidebar + map layout, conditional mobile/desktop rendering |
| `src/components/map/ViewToggle.tsx` | Update styling to match reference (outline vs filled) |
| `src/components/map/SearchBar.tsx` | Simplify design, remove voice search, cleaner look |
| `src/components/map/RadiusFilter.tsx` | Update to white card style with preset buttons |
| `src/components/map/Header.tsx` | Make mobile-only or update for mobile header |

---

## Technical Details

### LeftSidebarPanel Props
```typescript
interface LeftSidebarPanelProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  candidateCount: number;
  jobCount: number;
  governmentJobCount: number;
  privateJobCount: number;
  onViewList: () => void;
  userLocation: { lat: number; lng: number } | null;
}
```

### Layout Structure
```tsx
// Desktop layout
<div className="flex h-screen">
  <div className="hidden md:block w-[300px] bg-white border-r">
    <LeftSidebarPanel {...props} />
  </div>
  <div className="flex-1 relative">
    <MapContainer {...props} />
    {/* Nav button stays here */}
  </div>
</div>

// Mobile layout uses existing components
<div className="md:hidden">
  <Header />
  <MapContainer />
  <StatsBottomSheet />
  <BottomNavBar />
</div>
```

---

## Visual Style Guide

| Element | Style |
|---------|-------|
| Sidebar Background | White (#FFFFFF) |
| Section Cards | White with subtle gray border, rounded-xl |
| Mode Toggle Active | Coral/Red fill (#EA4335) with white text |
| Mode Toggle Inactive | White/outline with gray text |
| Primary Button | Blue (#4285F4) with white text |
| Search Bar | White with gray border, rounded-lg |
| Radius Presets | Gray pills, blue fill when active |
| Stats Count | Large red/blue number |
| Map Markers | Red circles with white briefcase icon |
| User Location | Small green pulsing dot |
| Radius Circle | Red stroke with light red fill |
