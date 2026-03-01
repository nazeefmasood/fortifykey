# FortifyKey — Full Password Manager Rebuild Plan

## Context

Rebuilding FortifyKey from a React Native prototype into a production-grade, cross-platform password manager. The app will run as a **website** (sidebar layout), **Electron desktop app** (native feel with system tray), **PWA** (mobile app with bottom nav), and **Chrome extension** (auto-detect logins, auto-fill). All platforms share the same codebase via a Turborepo monorepo.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Monorepo | Turborepo |
| Framework | Next.js 14+ (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui base components |
| Auth | Clerk (`@clerk/nextjs` + `@clerk/chrome-extension`) |
| Database | Supabase (PostgreSQL + RLS + Realtime) |
| Local DB | Dexie.js (IndexedDB) — offline-first |
| Encryption | Web Crypto API (AES-256-GCM + PBKDF2 600K iterations) |
| Icons | Lucide React |
| Desktop | Electron (frameless window, system tray, global shortcuts) |
| PWA | @ducanh2912/next-pwa |
| Extension | Chrome Manifest V3 |
| Animations | CSS @keyframes + framer-motion |
| Carousel | embla-carousel-react |
| State | Dexie `useLiveQuery` + Zustand (master key in memory) |

---

## Monorepo Structure

```
fortifykey/
├── apps/
│   ├── web/                        # Next.js app (website + PWA + Electron host)
│   │   ├── app/
│   │   │   ├── layout.tsx          # ClerkProvider, ThemeProvider, PlatformProvider
│   │   │   ├── page.tsx            # Redirect based on auth state
│   │   │   ├── globals.css         # Tailwind + glassmorphism utilities
│   │   │   ├── (auth)/
│   │   │   │   ├── layout.tsx      # Full-screen centered layout
│   │   │   │   ├── login/page.tsx  # OAuth login (gradient + glassmorphism)
│   │   │   │   └── lock/page.tsx   # Master password entry
│   │   │   └── (vault)/
│   │   │       ├── layout.tsx      # Adaptive shell (Web/Desktop/PWA)
│   │   │       ├── dashboard/page.tsx
│   │   │       ├── generator/page.tsx
│   │   │       ├── new-item/page.tsx    # Unified form for all vault item types
│   │   │       ├── categories/page.tsx
│   │   │       ├── item/[id]/page.tsx   # Single item detail view
│   │   │       └── settings/page.tsx
│   │   ├── components/
│   │   │   ├── shells/             # WebShell, DesktopShell, PwaShell
│   │   │   ├── ui/                 # Button, Input, Card, Modal, Slider, RadialSlider, PasswordText
│   │   │   ├── layout/            # Header, Sidebar, BottomNav, CategoryPills
│   │   │   ├── cards/             # VaultItemCard (adaptive), PasswordCard
│   │   │   └── modals/            # IconSelection, CreateCategory, ConfirmDelete
│   │   ├── hooks/                 # useVaultItems, useCategories, usePlatform, useMasterPassword
│   │   ├── electron/
│   │   │   ├── main.ts            # Electron main process (tray, global shortcuts)
│   │   │   └── preload.ts
│   │   ├── public/
│   │   │   ├── manifest.json      # PWA manifest
│   │   │   └── icons/
│   │   ├── middleware.ts           # Clerk route protection
│   │   ├── next.config.mjs
│   │   └── tailwind.config.ts
│   │
│   └── extension/                  # Chrome Extension (Manifest V3)
│       ├── manifest.json
│       ├── background/
│       │   ├── service-worker.ts   # Auth, vault cache, domain matching
│       │   └── crypto.ts
│       ├── content/
│       │   ├── detector.ts         # Login form detection (heuristic scoring)
│       │   ├── autofill.ts         # Field filling logic
│       │   └── save-detector.ts    # Detect form submissions → offer to save
│       ├── popup/
│       │   ├── Popup.tsx           # React popup UI
│       │   ├── VaultList.tsx       # Matching credentials for current domain
│       │   └── Generator.tsx       # Inline password generator
│       └── shared/                 # Extension-specific shared code
│
├── packages/
│   ├── shared/                     # Shared code across all apps
│   │   ├── encryption.ts           # AES-256-GCM encrypt/decrypt, key derivation
│   │   ├── password-generator.ts   # Generate passwords from slider params
│   │   ├── password-strength.ts    # Score and classify passwords
│   │   ├── supabase-client.ts      # Supabase client factory (accepts Clerk JWT)
│   │   ├── types.ts                # All TypeScript types (VaultItem, payloads, etc.)
│   │   ├── constants.ts            # Shared constants
│   │   └── domain-utils.ts         # URL/domain normalization and matching
│   ├── db/                         # Dexie.js local database
│   │   ├── schema.ts              # IndexedDB schema
│   │   ├── sync.ts                # Push/pull sync protocol
│   │   ├── realtime.ts            # Supabase Realtime handler
│   │   └── echo-guard.ts         # Suppress own-write echoes
│   └── ui/                        # (optional) shared UI primitives if needed
│
├── turbo.json
├── package.json
└── tsconfig.json
```

---

## Database Schema (Supabase)

### Encryption Architecture

```
Master Password → PBKDF2 (600K iterations, SHA-256, random salt) → Master Key
Master Key → encrypts → Vault Key (random 256-bit AES key)
Vault Key → encrypts → each vault item's sensitive fields
```

Changing the master password only re-encrypts the vault key, not every item.

### Tables

```sql
-- User key material
CREATE TABLE user_keys (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              text UNIQUE NOT NULL,  -- Clerk user ID
  encrypted_vault_key  jsonb NOT NULL,         -- vault key encrypted with master key
  key_salt             text NOT NULL,           -- PBKDF2 salt (base64)
  key_iterations       integer DEFAULT 600000,
  password_hint        text,
  created_at           timestamptz DEFAULT now()
);

-- Polymorphic vault items
CREATE TABLE vault_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            text NOT NULL,
  item_type          text NOT NULL,      -- 'login','card','note','identity','wifi','license','backup_codes'
  name               text NOT NULL,      -- PLAINTEXT: for search & display
  domain             text,               -- PLAINTEXT: normalized domain (login matching)
  category_id        uuid REFERENCES categories(id),
  favorite           boolean DEFAULT false,
  encrypted_data     jsonb NOT NULL,     -- AES-256-GCM encrypted blob (all secrets inside)
  icon_url           text,               -- favicon URL
  password_strength  integer,            -- 0-100 score (for dashboard stats)
  last_used_at       timestamptz,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  deleted_at         timestamptz,        -- soft delete
  version            integer DEFAULT 1   -- optimistic concurrency
);

-- Categories
CREATE TABLE categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text NOT NULL,
  name       text NOT NULL,
  icon       text DEFAULT 'lock',
  color      text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Sync log for offline delta sync
CREATE TABLE sync_log (
  id          bigserial PRIMARY KEY,
  user_id     text NOT NULL,
  item_id     uuid NOT NULL,
  operation   text NOT NULL,  -- 'INSERT','UPDATE','DELETE'
  version     integer NOT NULL,
  timestamp   timestamptz DEFAULT now()
);

-- RLS: all tables restricted to user's own data via Clerk JWT sub claim
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY vault_items_policy ON vault_items
  FOR ALL USING (user_id = auth.jwt()->>'sub');
CREATE POLICY user_keys_policy ON user_keys
  FOR ALL USING (user_id = auth.jwt()->>'sub');
CREATE POLICY categories_policy ON categories
  FOR ALL USING (user_id = auth.jwt()->>'sub');

-- Indexes
CREATE INDEX idx_vault_items_user ON vault_items(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vault_items_domain ON vault_items(user_id, domain) WHERE deleted_at IS NULL;
CREATE INDEX idx_vault_items_type ON vault_items(user_id, item_type) WHERE deleted_at IS NULL;
```

### What's Encrypted vs Plaintext

| Plaintext (searchable) | Encrypted (in `encrypted_data`) |
|------------------------|---------------------------------|
| `name`, `domain`, `item_type` | Usernames, passwords, card numbers |
| `category_id`, `favorite` | CVVs, PINs, license keys |
| `icon_url`, `password_strength` | Notes, addresses, document numbers |
| `last_used_at`, timestamps | TOTP secrets, backup codes |

### Encrypted Payload Types

- **Login**: `urls[], username, password, totp_secret?, custom_fields[], notes`
- **Card**: `cardholder_name, card_number, expiry, cvv, pin?, billing_address, notes`
- **Secure Note**: `content (markdown), attachments[]`
- **Identity**: `document_type, full_name, document_number, dates, address, notes`
- **WiFi**: `ssid, password, security_type, hidden_network, notes`
- **Software License**: `product_name, license_key, email, version, dates, notes`
- **2FA Backup Codes**: `service_name, service_url, codes[{code, used}], notes`

---

## Auth Flow

1. **Clerk OAuth** → Google/Facebook/Apple sign-in
2. **Clerk webhook** (`user.created`) → Insert user row in Supabase
3. **First-time setup** → User creates master password → hash stored in `user_keys`, vault key generated and encrypted with master key
4. **Lock screen** → Enter master password → derive key → decrypt vault key → store in Zustand (memory only)
5. **Auto-lock** → After 15 min inactivity, clear vault key from memory → redirect to lock screen
6. **Supabase access** → Clerk JWT template "supabase" → passed as Bearer token for RLS

---

## Adaptive UI: 3 Shells, 1 Codebase

### Web (Browser) — `WebShell`
- Left sidebar (280px): logo, navigation, categories, user avatar
- Main content: wider cards in 2-3 column grid
- Keyboard shortcuts: Ctrl+K search, Ctrl+N new item, Ctrl+L lock

### Desktop (Electron) — `DesktopShell`
- Frameless window with custom titlebar (drag, minimize/maximize/close)
- Collapsible sidebar (60px → 280px on hover)
- System tray icon with quick-copy
- Global shortcut (Ctrl+Shift+P) to summon

### PWA (Mobile) — `PwaShell`
- Bottom navigation: Home, Vault, Add, Generate, Settings
- Compact single-column cards
- Swipe gestures: left=delete, right=copy
- Pull-to-refresh triggers sync
- `100dvh` viewport

### Platform Detection
```typescript
function detectPlatform(): 'web' | 'desktop' | 'pwa' {
  if (window.__ELECTRON__) return 'desktop';
  if (matchMedia('(display-mode: standalone)').matches || innerWidth < 768) return 'pwa';
  return 'web';
}
```

---

## Offline-First Strategy

- **Dexie.js** (IndexedDB) stores entire encrypted vault locally
- All reads from local DB first (instant)
- Writes → local DB + sync queue → push to Supabase when online
- `useLiveQuery` from Dexie for reactive updates

### Sync Protocol
- **Push**: Queue local changes → push with version check (optimistic concurrency)
- **Pull**: Delta sync using `updated_at > last_sync_timestamp`
- **Conflicts**: Version-based last-write-wins, user notified
- **Initial sync**: Full vault download on first login per device

### Real-time Cross-Device Sync
- Supabase Realtime on `vault_items` filtered by `user_id`
- Incoming changes → IndexedDB → `useLiveQuery` auto-updates UI
- Echo suppression for own writes
- Reconnection with delta-pull for missed events

---

## Chrome Extension (Manifest V3)

### Features
1. **Form detection**: Heuristic scoring — `input[type=password]`, form action, nearby username field
2. **Credential suggestion**: Match by normalized domain → icon overlay on username field
3. **Auto-fill**: Click → fill username + password
4. **Save new logins**: Detect form submission → offer to save
5. **Inline generator**: Generate passwords in popup

### Auth
- Separate Clerk login (`@clerk/chrome-extension`)
- Master password in service worker memory
- Auto-lock after 15 min via `chrome.alarms`
- Shares data via Supabase (same RLS, same user)

---

## Password Generator

```
3 sliders: Words ratio, Special chars ratio, Numbers ratio (0-100 each)
1 radial slider: Total length (1-100)

Algorithm: Normalize ratios → compute counts → crypto.getRandomValues() → Fisher-Yates shuffle
```

Custom SVG RadialSlider: arc path + draggable thumb + `Math.atan2` for angle calculation.

---

## Screen Color Themes (from original)

| Screen | Background | Key Colors |
|--------|-----------|------------|
| Login | Gradient `rgba(0,0,0,0.7)` → `rgba(67,24,255,0.6)` | Glassmorphism, OAuth buttons |
| Lock | `#fff` | `#000`, `#888` |
| Dashboard | `#628EFB` | `#4CAF50` / `#FFA000` / `#F44336` |
| New Item | `#3a86ff` | `rgba(39,40,41,0.37)`, `#FF9F1C` |
| Generator | `#DD4848` | `#ffd700`, `#eb564F` |
| Categories | `#4aa14e` | `#71bd81`, `#FF6B6B` |
| Item Detail | `#49A14E` | `rgba(255,255,255,0.2)` |

---

## Implementation Phases

### Phase 1: Foundation
- Init Turborepo monorepo
- Next.js 14 + TypeScript + Tailwind with color tokens
- Clerk + Supabase setup (schema, RLS, JWT template)
- `packages/shared`: encryption, generator, strength, types
- `packages/db`: Dexie schema, basic sync
- Zustand master-key store

### Phase 2: Auth Screens
- Login: gradient + glassmorphism + OAuth + CSS animations
- Lock: master password + avatar
- First-time setup flow
- Clerk webhook for user sync

### Phase 3: Adaptive Shell + Design System
- WebShell, DesktopShell, PwaShell + platform detection
- All UI components: Input, Button, Card, Modal, PasswordText, StrengthBadge, Header, Sidebar, BottomNav, CategoryPills, IconGrid

### Phase 4: Dashboard + Vault CRUD
- Dashboard: hero text, stats, cards
- New Item: unified form for all 7 item types
- Item detail: glassmorphic card + copy/edit/delete
- Categories: carousel + creation modal
- Dexie + Supabase wiring

### Phase 5: Password Generator
- 3 range sliders + custom SVG RadialSlider
- Functional algorithm
- "Use" → pre-fill new item form

### Phase 6: Offline + Real-time
- Full offline-first with Dexie
- Push/pull sync + conflict resolution
- Supabase Realtime + echo suppression

### Phase 7: Chrome Extension
- Manifest V3 + Clerk auth
- Form detection + auto-fill
- Popup: vault list, generator
- Save-on-submit

### Phase 8: Electron
- Frameless window + custom titlebar
- System tray + global shortcut
- electron-builder packaging

### Phase 9: Polish
- Page transitions, toasts, skeletons
- Responsive testing
- Error handling + auto-lock UI

---

## Verification

1. Auth: OAuth → master password setup → lock → unlock → dashboard
2. CRUD: Add login/card/note → dashboard → edit → delete
3. Encryption: Supabase table shows ciphertext only
4. Generator: Sliders produce real passwords → "Use" fills form
5. Offline: Disconnect → add password → reconnect → syncs
6. Real-time: 2 tabs → add in one → appears in other
7. Extension: Login page → auto-fill works
8. PWA: Install on mobile → bottom nav → offline works
9. Electron: Desktop window → system tray → global shortcut
10. Adaptive: Same URL → sidebar (web), bottom nav (mobile), custom titlebar (Electron)
