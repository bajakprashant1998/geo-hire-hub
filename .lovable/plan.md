

## Plan: Enhance Login/Signup Pages + Mandatory Location Access

### 1. Create a `LocationGate` component
A full-screen overlay component that blocks the entire app if location permission is denied. It will:
- Use `navigator.permissions.query({ name: 'geolocation' })` to check permission state
- Call `navigator.geolocation.getCurrentPosition` to trigger the browser prompt
- Show a blocking overlay with a message and "Enable Location" retry button if denied
- Store granted location in React context so all pages can access it
- Wrap the entire app in `App.tsx` (inside `BrowserRouter`, around `Routes`)

**File**: `src/components/LocationGate.tsx`

### 2. Expand `InternationalPhoneInput` with full world country codes
- Add ~200 country codes covering all countries (currently has ~40)
- This component already has search/filter built in, so just expanding the data array

**File**: `src/components/InternationalPhoneInput.tsx`

### 3. Expand SECTORS list on Signup page
Add ~30 more industries to the employer section:
- Legal, Consulting, Insurance, Logistics, Aerospace, Automotive, Pharmaceutical, Mining, Fashion, Food & Beverage, Sports, Government, Non-Profit, etc.

**File**: `src/pages/Signup.tsx`

### 4. Add WhatsApp number field on Signup page
- Add a new `whatsappNumber` state field
- Use the `InternationalPhoneInput` component for both phone and WhatsApp fields
- Replace the current basic phone input with `InternationalPhoneInput`
- Include WhatsApp number in the signup metadata

**File**: `src/pages/Signup.tsx`

### 5. Enhance Login page UI
- Add subtle glassmorphism card wrapper around the form
- Add trust badges / security indicators
- Add password strength hint text
- Improve mobile responsiveness
- Add animated transitions between states

**File**: `src/pages/Login.tsx`

### 6. Enhance Signup page UI
- Wrap form in a glassmorphism card
- Improve field grouping with section headers
- Add step progress indicator (visual only, single page)
- Better visual hierarchy and spacing
- Add password strength meter

**File**: `src/pages/Signup.tsx`

### 7. Wire LocationGate into App.tsx
- Import and wrap `<Routes>` with `<LocationGate>`
- The gate will block rendering of any route until location is granted

**File**: `src/App.tsx`

### Technical Details

**LocationGate implementation**:
- Uses `navigator.geolocation.getCurrentPosition` on mount
- Listens for permission changes via `navigator.permissions.query`
- Three states: `loading` (checking), `granted` (renders children), `denied`/`prompt` (shows blocker)
- Blocker UI: full-screen centered card with MapPin icon, message, and "Allow Location Access" button that re-triggers the browser prompt
- Stores coords in a context provider so `useGeolocation` hook can optionally consume them

**Country codes expansion**: Will include all ~240 countries with ISO codes and emoji flags, sorted alphabetically by country name.

**WhatsApp field**: Separate `InternationalPhoneInput` instance with a WhatsApp icon, stored as `whatsapp_number` in user metadata.

