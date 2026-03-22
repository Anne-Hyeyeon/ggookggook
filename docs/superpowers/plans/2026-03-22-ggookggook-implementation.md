# ggookggook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual acupressure point guide web app with interactive body SVG, symptom-based search, acupressure timer, and favorites.

**Architecture:** Next.js 16 App Router with static JSON data for acupoints/symptoms, interactive SVG body map with viewBox zoom transitions, Zustand for client state, Supabase for auth and favorites, next-intl for i18n.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS v4, Zustand, Supabase, next-intl, Vercel

**Spec:** `docs/superpowers/specs/2026-03-22-ggookggook-design.md`

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout with providers
│   ├── page.tsx                      # Main page (top tabs + SVG)
│   ├── favorites/
│   │   └── page.tsx                  # Favorites page (auth required)
│   ├── login/
│   │   └── page.tsx                  # Login page
│   └── auth/
│       └── callback/
│           └── route.ts              # OAuth callback handler
├── components/
│   ├── BodySvg/
│   │   ├── BodySvgFront.tsx          # Front body SVG component
│   │   ├── BodySvgBack.tsx           # Back body SVG component
│   │   ├── BodySvgViewer.tsx         # Viewer with zoom/toggle logic
│   │   ├── AcupointDot.tsx           # Clickable acupoint dot overlay
│   │   └── bodyRegions.ts            # Region viewBox coordinates mapping
│   ├── BottomSheet/
│   │   ├── BottomSheet.tsx           # Generic bottom sheet component
│   │   └── AcupointDetail.tsx        # Acupoint detail content
│   ├── Timer/
│   │   └── AcupressureTimer.tsx      # Timer with presets, ±, direct input
│   ├── Tabs/
│   │   ├── TabBar.tsx                # Top tab bar (Body/Symptom/Search)
│   │   ├── BodyPartTab.tsx           # Body part tab content
│   │   ├── SymptomTab.tsx            # Symptom chips tab content
│   │   └── SearchTab.tsx             # Search input + results list
│   ├── Navigation/
│   │   ├── BottomNav.tsx             # Bottom navigation bar
│   │   └── ProfileDropdown.tsx       # My profile dropdown
│   ├── AcupointCard.tsx              # Acupoint card for search/favorites
│   ├── LocaleSwitcher.tsx            # Language toggle (ko/en)
│   └── AuthProvider.tsx              # Supabase auth provider
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   └── server.ts                 # Server Supabase client
│   ├── hooks/
│   │   ├── useBodySvg.ts             # SVG zoom/region state hook
│   │   ├── useAcupointSearch.ts      # Debounced search hook
│   │   ├── useFavorites.ts           # Favorites CRUD hook
│   │   └── useTimer.ts              # Timer logic hook
│   └── utils/
│       ├── locale.ts                 # Locale helper (get ko/en field)
│       └── data.ts                   # Data loading/validation utilities
├── store/
│   ├── useAppStore.ts                # Active tab, selected region, zoom state
│   └── useSetGuideStore.ts           # Symptom set navigation state
├── types/
│   └── index.ts                      # IAcupoint, ISymptom, BodyPart, IFavorite
├── i18n/
│   ├── request.ts                    # next-intl request config
│   └── messages/
│       ├── ko.json                   # Korean UI strings
│       └── en.json                   # English UI strings
└── data/
    ├── acupoints.json                # Static acupoint data
    └── symptoms.json                 # Static symptom data (source of truth)
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/anne/Documents/GitHub/ggookggook
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --use-npm --no-import-alias
```

Select defaults. This creates the base Next.js 16 project with Tailwind CSS v4.

- [ ] **Step 2: Verify project runs**

```bash
cd /Users/anne/Documents/GitHub/ggookggook
npm run dev
```

Expected: Dev server starts at localhost:3000 without errors.

- [ ] **Step 3: Clean up boilerplate**

Remove default content from `src/app/page.tsx`, replace with minimal placeholder:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-bold">ggookggook</h1>
    </main>
  );
}
```

Remove default styles from `src/app/globals.css` except Tailwind directives.

- [ ] **Step 4: Initialize git and commit**

```bash
cd /Users/anne/Documents/GitHub/ggookggook
git init
echo ".superpowers/" >> .gitignore
git add .
git commit -m "chore: scaffold Next.js 16 project with Tailwind CSS v4"
```

---

## Task 2: Type Definitions & Static Data

**Files:**
- Create: `src/types/index.ts`
- Create: `src/data/acupoints.json`
- Create: `src/data/symptoms.json`
- Create: `src/lib/utils/data.ts`

- [ ] **Step 1: Create type definitions**

```typescript
// src/types/index.ts
export type BodyPart =
  | "head" | "face" | "neck" | "shoulder"
  | "arm" | "hand" | "chest" | "abdomen"
  | "back" | "hip" | "leg" | "foot";

export type BodyView = "front" | "back";

export interface IBilingualText {
  ko: string;
  en: string;
}

export interface IAcupoint {
  id: string;
  name: IBilingualText;
  bodyPart: BodyPart;
  view: BodyView;
  position: { x: number; y: number };
  description: IBilingualText;
  benefits: string[];
  technique: IBilingualText;
  videoUrl?: string;
}

export interface ISymptom {
  id: string;
  name: IBilingualText;
  acupointIds: string[];
}

export interface IFavorite {
  id: string;
  userId: string;
  acupointId: string;
  createdAt: string;
}

export type TabType = "body" | "symptom" | "search";
export type Locale = "ko" | "en";
```

- [ ] **Step 2: Create symptom data**

Create `src/data/symptoms.json` with all 16 MVP symptoms from the spec. Each symptom has `id`, `name: { ko, en }`, and `acupointIds: []` (initially empty, populated in Step 4).

- [ ] **Step 3: Create acupoint seed data**

Create `src/data/acupoints.json` with 5-10 initial acupoints for development/testing. Include at least one per body view (front/back). Example:

```json
[
  {
    "id": "LI4",
    "name": { "ko": "합곡", "en": "Hegu" },
    "bodyPart": "hand",
    "view": "front",
    "position": { "x": 120, "y": 450 },
    "description": {
      "ko": "엄지와 검지 사이 움푹 들어간 곳",
      "en": "In the depression between thumb and index finger"
    },
    "benefits": ["headache", "stress", "nausea"],
    "technique": {
      "ko": "반대쪽 엄지로 3-5초간 꾹 누른 후 떼기를 반복 (2-3분)",
      "en": "Press firmly with opposite thumb for 3-5 seconds, release, repeat for 2-3 minutes"
    }
  }
]
```

- [ ] **Step 4: Populate symptom-acupoint relationships**

Update `symptoms.json` `acupointIds` arrays to reference the seed acupoints. Ensure consistency: every acupoint ID in `acupointIds` exists in `acupoints.json`, and every ID in `benefits` exists in `symptoms.json`.

- [ ] **Step 5: Create data loading utility**

```typescript
// src/lib/utils/data.ts
import acupointsData from "@/data/acupoints.json";
import symptomsData from "@/data/symptoms.json";
import type { IAcupoint, ISymptom } from "@/types";

export const getAcupoints = (): IAcupoint[] => acupointsData as IAcupoint[];

export const getSymptoms = (): ISymptom[] => symptomsData as ISymptom[];

export const getAcupointById = (id: string): IAcupoint | undefined =>
  getAcupoints().find((a) => a.id === id);

export const getAcupointsByBodyPart = (bodyPart: string): IAcupoint[] =>
  getAcupoints().filter((a) => a.bodyPart === bodyPart);

export const getAcupointsBySymptom = (symptomId: string): IAcupoint[] => {
  const symptom = getSymptoms().find((s) => s.id === symptomId);
  if (!symptom) return [];
  return symptom.acupointIds
    .map((id) => getAcupointById(id))
    .filter((a): a is IAcupoint => a !== undefined);
};

export const searchAcupoints = (query: string): IAcupoint[] => {
  const q = query.toLowerCase();
  return getAcupoints().filter(
    (a) =>
      a.name.ko.includes(q) ||
      a.name.en.toLowerCase().includes(q) ||
      a.benefits.some((b) => b.includes(q))
  );
};
```

- [ ] **Step 6: Write tests for data utilities**

Create `src/lib/utils/__tests__/data.test.ts`:

```typescript
import { getAcupoints, getSymptoms, getAcupointById, getAcupointsBySymptom, searchAcupoints } from "../data";

describe("data utilities", () => {
  it("should load all acupoints", () => {
    const acupoints = getAcupoints();
    expect(acupoints.length).toBeGreaterThan(0);
    expect(acupoints[0]).toHaveProperty("id");
    expect(acupoints[0]).toHaveProperty("name");
  });

  it("should load all symptoms", () => {
    const symptoms = getSymptoms();
    expect(symptoms.length).toBe(16);
  });

  it("should find acupoint by id", () => {
    const acupoint = getAcupointById("LI4");
    expect(acupoint).toBeDefined();
    expect(acupoint?.name.ko).toBe("합곡");
  });

  it("should return undefined for unknown id", () => {
    expect(getAcupointById("UNKNOWN")).toBeUndefined();
  });

  it("should find acupoints by symptom", () => {
    const results = getAcupointsBySymptom("headache");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((a) => a.benefits.includes("headache"))).toBe(true);
  });

  it("should search by Korean name", () => {
    const results = searchAcupoints("합곡");
    expect(results.length).toBeGreaterThan(0);
  });

  it("should search by English name", () => {
    const results = searchAcupoints("hegu");
    expect(results.length).toBeGreaterThan(0);
  });

  it("should return empty array for no match", () => {
    const results = searchAcupoints("xyznonexistent");
    expect(results).toEqual([]);
  });

  describe("data consistency validation", () => {
    it("every acupoint benefit ID should exist in symptoms", () => {
      const acupoints = getAcupoints();
      const symptomIds = getSymptoms().map((s) => s.id);
      acupoints.forEach((a) => {
        a.benefits.forEach((b) => {
          expect(symptomIds).toContain(b);
        });
      });
    });

    it("every symptom acupointId should exist in acupoints", () => {
      const symptoms = getSymptoms();
      const acupointIds = getAcupoints().map((a) => a.id);
      symptoms.forEach((s) => {
        s.acupointIds.forEach((id) => {
          expect(acupointIds).toContain(id);
        });
      });
    });
  });
});
```

- [ ] **Step 7: Install Jest and run tests**

```bash
npm install --save-dev jest ts-jest @types/jest
npx ts-jest config:init
```

Configure `jest.config.js` with `moduleNameMapper` for `@/` alias. Run:

```bash
npx jest src/lib/utils/__tests__/data.test.ts --verbose
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/types/ src/data/ src/lib/utils/ jest.config.js
git commit -m "feat: add type definitions, seed data, and data utilities with tests"
```

---

## Task 3: Zustand Stores

**Files:**
- Create: `src/store/useAppStore.ts`
- Create: `src/store/useSetGuideStore.ts`

- [ ] **Step 1: Install Zustand**

```bash
npm install zustand
```

- [ ] **Step 2: Create app store**

```typescript
// src/store/useAppStore.ts
import { create } from "zustand";
import type { BodyPart, BodyView, TabType } from "@/types";

interface IAppState {
  activeTab: TabType;
  selectedRegion: BodyPart | null;
  bodyView: BodyView;
  isZoomed: boolean;
  selectedAcupointId: string | null;
  isBottomSheetOpen: boolean;

  setActiveTab: (tab: TabType) => void;
  selectRegion: (region: BodyPart) => void;
  clearRegion: () => void;
  toggleBodyView: () => void;
  openAcupointDetail: (id: string) => void;
  closeBottomSheet: () => void;
  resetView: () => void;
}

export const useAppStore = create<IAppState>((set) => ({
  activeTab: "body",
  selectedRegion: null,
  bodyView: "front",
  isZoomed: false,
  selectedAcupointId: null,
  isBottomSheetOpen: false,

  setActiveTab: (tab) => set({ activeTab: tab, selectedRegion: null, isZoomed: false }),
  selectRegion: (region) => set({ selectedRegion: region, isZoomed: true }),
  clearRegion: () => set({ selectedRegion: null, isZoomed: false }),
  toggleBodyView: () => set((s) => ({ bodyView: s.bodyView === "front" ? "back" : "front" })),
  openAcupointDetail: (id) => set({ selectedAcupointId: id, isBottomSheetOpen: true }),
  closeBottomSheet: () => set({ selectedAcupointId: null, isBottomSheetOpen: false }),
  resetView: () => set({ selectedRegion: null, isZoomed: false, selectedAcupointId: null, isBottomSheetOpen: false }),
}));
```

- [ ] **Step 3: Create set guide store**

```typescript
// src/store/useSetGuideStore.ts
import { create } from "zustand";

interface ISetGuideState {
  symptomId: string | null;
  acupointIds: string[];
  currentIndex: number;
  timerDuration: number;

  startSetGuide: (symptomId: string, acupointIds: string[]) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  setTimerDuration: (duration: number) => void;
  clearSetGuide: () => void;
}

export const useSetGuideStore = create<ISetGuideState>((set) => ({
  symptomId: null,
  acupointIds: [],
  currentIndex: 0,
  timerDuration: 20,

  startSetGuide: (symptomId, acupointIds) =>
    set({ symptomId, acupointIds, currentIndex: 0 }),
  goToNext: () =>
    set((s) => ({
      currentIndex: Math.min(s.currentIndex + 1, s.acupointIds.length - 1),
    })),
  goToPrevious: () =>
    set((s) => ({
      currentIndex: Math.max(s.currentIndex - 1, 0),
    })),
  setTimerDuration: (duration) => set({ timerDuration: duration }),
  clearSetGuide: () =>
    set({ symptomId: null, acupointIds: [], currentIndex: 0 }),
}));
```

- [ ] **Step 4: Commit**

```bash
git add src/store/
git commit -m "feat: add Zustand stores for app state and set guide navigation"
```

---

## Task 4: i18n Setup (next-intl)

**Files:**
- Create: `src/i18n/request.ts`
- Create: `src/i18n/messages/ko.json`, `src/i18n/messages/en.json`
- Create: `src/lib/utils/locale.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Install next-intl**

```bash
npm install next-intl
```

- [ ] **Step 2: Create locale messages**

```json
// src/i18n/messages/ko.json
{
  "common": {
    "appName": "꾹꾹",
    "home": "홈",
    "favorites": "즐겨찾기",
    "my": "마이",
    "login": "로그인",
    "logout": "로그아웃",
    "search": "검색",
    "back": "뒤로"
  },
  "tabs": {
    "bodyPart": "부위",
    "symptom": "증상",
    "search": "검색"
  },
  "body": {
    "front": "전면",
    "back": "후면",
    "head": "머리", "face": "얼굴", "neck": "목",
    "shoulder": "어깨", "arm": "팔", "hand": "손",
    "chest": "가슴", "abdomen": "배", "back_region": "등",
    "hip": "엉덩이", "leg": "다리", "foot": "발"
  },
  "detail": {
    "benefits": "효능",
    "technique": "지압법",
    "timer": "지압 타이머",
    "start": "시작",
    "pause": "일시정지",
    "video": "지압 영상"
  },
  "favorites_page": {
    "empty": "즐겨찾기한 혈자리가 없습니다",
    "goHome": "홈으로 가기"
  },
  "search_page": {
    "placeholder": "혈자리 검색...",
    "empty": "검색 결과가 없습니다",
    "suggestion": "다른 키워드를 시도해보세요"
  },
  "auth": {
    "loginWith": "{provider}로 로그인",
    "loginRequired": "로그인이 필요합니다"
  }
}
```

Create `src/i18n/messages/en.json`:

```json
{
  "common": {
    "appName": "ggookggook",
    "home": "Home",
    "favorites": "Favorites",
    "my": "My",
    "login": "Login",
    "logout": "Logout",
    "search": "Search",
    "back": "Back"
  },
  "tabs": {
    "bodyPart": "Body Part",
    "symptom": "Symptom",
    "search": "Search"
  },
  "body": {
    "front": "Front",
    "back": "Back",
    "zoomOut": "Full view",
    "head": "Head", "face": "Face", "neck": "Neck",
    "shoulder": "Shoulder", "arm": "Arm", "hand": "Hand",
    "chest": "Chest", "abdomen": "Abdomen", "back_region": "Back",
    "hip": "Hip", "leg": "Leg", "foot": "Foot"
  },
  "detail": {
    "benefits": "Benefits",
    "technique": "Technique",
    "timer": "Acupressure Timer",
    "start": "Start",
    "pause": "Pause",
    "video": "Video",
    "seconds": "s",
    "prev": "← Prev",
    "next": "Next →"
  },
  "favorites_page": {
    "title": "Favorites",
    "empty": "No favorite acupoints yet",
    "goHome": "Go to Home"
  },
  "search_page": {
    "placeholder": "Search acupoints...",
    "empty": "No results found",
    "suggestion": "Try a different keyword"
  },
  "auth": {
    "loginWith": "Login with {provider}",
    "loginRequired": "Login required"
  }
}
```

Also add to `ko.json` the missing keys:

```json
"body": {
  ...
  "zoomOut": "전체 보기"
},
"detail": {
  ...
  "seconds": "초",
  "prev": "← 이전",
  "next": "다음 →"
},
"favorites_page": {
  "title": "즐겨찾기",
  ...
}
```

- [ ] **Step 3: Create next-intl request config**

```typescript
// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value || "ko";

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 4: Create locale utility**

```typescript
// src/lib/utils/locale.ts
import type { IBilingualText, Locale } from "@/types";

export const getLocalizedText = (text: IBilingualText, locale: Locale): string =>
  text[locale];
```

- [ ] **Step 5: Update next.config.ts for next-intl**

Add next-intl plugin configuration to `next.config.ts`:

```typescript
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig = {};

export default withNextIntl(nextConfig);
```

- [ ] **Step 6: Update root layout with NextIntlClientProvider**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "ggookggook | 꾹꾹 - 혈자리 지압 가이드",
  description: "셀프 지압을 위한 혈자리 가이드 앱",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Create LocaleSwitcher component**

```tsx
// src/components/LocaleSwitcher.tsx
"use client";

import { useLocale } from "next-intl";
import type { Locale } from "@/types";

export const LocaleSwitcher = () => {
  const locale = useLocale() as Locale;

  const handleSwitch = () => {
    const newLocale = locale === "ko" ? "en" : "ko";
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    window.location.reload();
  };

  return (
    <button
      onClick={handleSwitch}
      className="rounded-full border border-gray-300 px-2.5 py-1 text-xs"
      aria-label={`Switch to ${locale === "ko" ? "English" : "한국어"}`}
    >
      {locale === "ko" ? "EN" : "한국어"}
    </button>
  );
};
```

- [ ] **Step 8: Verify dev server starts without errors**

```bash
npm run dev
```

Expected: No errors. Page loads at localhost:3000.

- [ ] **Step 9: Commit**

```bash
git add src/i18n/ src/lib/utils/locale.ts src/app/layout.tsx next.config.ts src/components/LocaleSwitcher.tsx
git commit -m "feat: add next-intl i18n setup with Korean/English messages and locale switcher"
```

---

## Task 5: Supabase Setup & Auth

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/components/AuthProvider.tsx`
- Create: `src/app/login/page.tsx`
- Create: `src/app/auth/callback/route.ts`

- [ ] **Step 1: Install Supabase packages**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Create .env.local**

```bash
# .env.local (user must fill in actual values)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Add `.env.local` to `.gitignore` if not already there. Create `.env.example` with placeholder values.

- [ ] **Step 3: Create Supabase browser client**

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
```

- [ ] **Step 4: Create Supabase server client**

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
};
```

- [ ] **Step 5: Create AuthProvider**

```tsx
// src/components/AuthProvider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface IAuthContext {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<IAuthContext>({ user: null, isLoading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

- [ ] **Step 6: Create login page**

```tsx
// src/app/login/page.tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const t = useTranslations("auth");
  const supabase = createClient();

  const handleOAuthLogin = async (provider: "google" | "kakao") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">꾹꾹</h1>
      <button
        onClick={() => handleOAuthLogin("google")}
        className="w-full max-w-xs rounded-lg border border-gray-300 px-6 py-3 font-medium hover:bg-gray-50"
      >
        {t("loginWith", { provider: "Google" })}
      </button>
      <button
        onClick={() => handleOAuthLogin("kakao")}
        className="w-full max-w-xs rounded-lg bg-yellow-300 px-6 py-3 font-medium hover:bg-yellow-400"
      >
        {t("loginWith", { provider: "Kakao" })}
      </button>
    </main>
  );
}
```

- [ ] **Step 7: Create auth callback route**

```typescript
// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

- [ ] **Step 8: Add AuthProvider to root layout**

Update `src/app/layout.tsx` to wrap children with `<AuthProvider>`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/supabase/ src/components/AuthProvider.tsx src/app/login/ src/app/auth/ .env.example src/app/layout.tsx
git commit -m "feat: add Supabase auth with Google/Kakao OAuth, login page, and callback"
```

---

## Task 6: Bottom Navigation & App Shell

**Files:**
- Create: `src/components/Navigation/BottomNav.tsx`
- Create: `src/components/Navigation/ProfileDropdown.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create BottomNav component**

```tsx
// src/components/Navigation/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { ProfileDropdown } from "./ProfileDropdown";
import clsx from "clsx";

export const BottomNav = () => {
  const pathname = usePathname();
  const t = useTranslations("common");
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white"
         role="navigation" aria-label="Main navigation">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        <Link
          href="/"
          className={clsx("flex flex-col items-center gap-1 px-4 py-1 text-xs",
            pathname === "/" ? "text-blue-600 font-semibold" : "text-gray-500"
          )}
          aria-current={pathname === "/" ? "page" : undefined}
        >
          <span aria-hidden="true">🏠</span>
          {t("home")}
        </Link>
        <Link
          href={user ? "/favorites" : "/login?next=/favorites"}
          className={clsx("flex flex-col items-center gap-1 px-4 py-1 text-xs",
            pathname === "/favorites" ? "text-blue-600 font-semibold" : "text-gray-500"
          )}
          aria-current={pathname === "/favorites" ? "page" : undefined}
        >
          <span aria-hidden="true">♡</span>
          {t("favorites")}
        </Link>
        <ProfileDropdown />
      </div>
    </nav>
  );
};
```

- [ ] **Step 2: Create ProfileDropdown component**

```tsx
// src/components/Navigation/ProfileDropdown.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";

export const ProfileDropdown = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const t = useTranslations("common");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsOpen(false);
    router.refresh();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => user ? setIsOpen(!isOpen) : router.push("/login")}
        className="flex flex-col items-center gap-1 px-4 py-1 text-xs text-gray-500"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span aria-hidden="true">👤</span>
        {t("my")}
      </button>
      {isOpen && user && (
        <div className="absolute bottom-full right-0 mb-2 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
             role="menu">
          <p className="truncate px-3 py-2 text-xs text-gray-500">{user.email}</p>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            role="menuitem"
          >
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Install clsx**

```bash
npm install clsx
```

- [ ] **Step 4: Add BottomNav to layout**

Update `src/app/layout.tsx` body to include `<BottomNav />` after `{children}`, and add `pb-16` to body for bottom nav spacing.

- [ ] **Step 5: Verify layout renders**

```bash
npm run dev
```

Expected: Page shows with bottom nav (Home, Favorites, My).

- [ ] **Step 6: Commit**

```bash
git add src/components/Navigation/ src/app/layout.tsx
git commit -m "feat: add bottom navigation bar with profile dropdown"
```

---

## Task 7: Top Tab Bar & Tab Content Structure

**Files:**
- Create: `src/components/Tabs/TabBar.tsx`
- Create: `src/components/Tabs/BodyPartTab.tsx`
- Create: `src/components/Tabs/SymptomTab.tsx`
- Create: `src/components/Tabs/SearchTab.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create TabBar component**

```tsx
// src/components/Tabs/TabBar.tsx
"use client";

import { useTranslations } from "next-intl";
import { useAppStore } from "@/store/useAppStore";
import type { TabType } from "@/types";
import clsx from "clsx";

const TABS: TabType[] = ["body", "symptom", "search"];

export const TabBar = () => {
  const t = useTranslations("tabs");
  const { activeTab, setActiveTab } = useAppStore();

  const tabLabels: Record<TabType, string> = {
    body: t("bodyPart"),
    symptom: t("symptom"),
    search: t("search"),
  };

  return (
    <div className="flex gap-2 px-4 py-3" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab}
          role="tab"
          aria-selected={activeTab === tab}
          onClick={() => setActiveTab(tab)}
          className={clsx(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            activeTab === tab
              ? "bg-blue-600 text-white"
              : "border border-gray-300 text-gray-600 hover:bg-gray-50"
          )}
        >
          {tabLabels[tab]}
        </button>
      ))}
    </div>
  );
};
```

- [ ] **Step 2: Create placeholder tab content components**

Create `BodyPartTab.tsx`, `SymptomTab.tsx`, `SearchTab.tsx` as placeholder client components that display their name. These will be filled in subsequent tasks.

- [ ] **Step 3: Wire up main page**

```tsx
// src/app/page.tsx
"use client";

import { useAppStore } from "@/store/useAppStore";
import { TabBar } from "@/components/Tabs/TabBar";
import { BodyPartTab } from "@/components/Tabs/BodyPartTab";
import { SymptomTab } from "@/components/Tabs/SymptomTab";
import { SearchTab } from "@/components/Tabs/SearchTab";

export default function Home() {
  const { activeTab } = useAppStore();

  return (
    <main className="mx-auto min-h-screen max-w-md pb-16">
      <TabBar />
      <div role="tabpanel">
        {activeTab === "body" && <BodyPartTab />}
        {activeTab === "symptom" && <SymptomTab />}
        {activeTab === "search" && <SearchTab />}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Verify tabs switch correctly**

```bash
npm run dev
```

Expected: Three tabs render, clicking switches content.

- [ ] **Step 5: Commit**

```bash
git add src/components/Tabs/ src/app/page.tsx
git commit -m "feat: add top tab bar with body/symptom/search tabs"
```

---

## Task 8: Body SVG Components

**Files:**
- Create: `src/components/BodySvg/BodySvgFront.tsx`
- Create: `src/components/BodySvg/BodySvgBack.tsx`
- Create: `src/components/BodySvg/BodySvgViewer.tsx`
- Create: `src/components/BodySvg/AcupointDot.tsx`
- Create: `src/components/BodySvg/bodyRegions.ts`
- Create: `src/lib/hooks/useBodySvg.ts`
- Modify: `src/components/Tabs/BodyPartTab.tsx`

- [ ] **Step 1: Define body region viewBox coordinates**

```typescript
// src/components/BodySvg/bodyRegions.ts
import type { BodyPart } from "@/types";

interface IRegionBounds {
  viewBox: string; // "x y width height" for zoomed view
  view: "front" | "back" | "both";
}

// These coordinates assume a 200x500 SVG canvas
// Adjust once actual SVG illustrations are created
export const BODY_REGIONS: Record<BodyPart, IRegionBounds> = {
  head:     { viewBox: "60 0 80 60",    view: "both" },
  face:     { viewBox: "65 15 70 50",   view: "front" },
  neck:     { viewBox: "70 55 60 30",   view: "both" },
  shoulder: { viewBox: "30 70 140 40",  view: "both" },
  arm:      { viewBox: "10 100 50 120", view: "both" },
  hand:     { viewBox: "0 210 50 60",   view: "front" },
  chest:    { viewBox: "55 90 90 80",   view: "front" },
  abdomen:  { viewBox: "60 160 80 70",  view: "front" },
  back:     { viewBox: "55 90 90 130",  view: "back" },
  hip:      { viewBox: "50 220 100 50", view: "back" },
  leg:      { viewBox: "50 270 100 150",view: "both" },
  foot:     { viewBox: "55 420 90 70",  view: "both" },
};

export const FULL_VIEWBOX = "0 0 200 500";
```

- [ ] **Step 2: Create placeholder SVG components**

Create `BodySvgFront.tsx` and `BodySvgBack.tsx` as simple SVGs with `<g>` groups for each region. Use basic shapes (rectangles/ellipses) as placeholders until real illustrations are created. Each region group has `id="region-{bodyPart}"` and a transparent hit-area rect.

```tsx
// src/components/BodySvg/BodySvgFront.tsx
"use client";

import type { BodyPart } from "@/types";

interface IBodySvgFrontProps {
  onRegionClick: (region: BodyPart) => void;
  highlightedAcupointIds?: string[];
}

export const BodySvgFront = ({ onRegionClick, highlightedAcupointIds = [] }: IBodySvgFrontProps) => (
  <>
    {/* Head */}
    <g id="region-head" onClick={() => onRegionClick("head")} className="cursor-pointer">
      <ellipse cx="100" cy="30" rx="25" ry="30" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="75" y="0" width="50" height="60" fill="transparent" />
    </g>
    {/* Face */}
    <g id="region-face" onClick={() => onRegionClick("face")} className="cursor-pointer">
      <circle cx="92" cy="25" r="3" fill="none" stroke="currentColor" strokeWidth="0.5" />
      <circle cx="108" cy="25" r="3" fill="none" stroke="currentColor" strokeWidth="0.5" />
      <rect x="75" y="15" width="50" height="35" fill="transparent" />
    </g>
    {/* Neck */}
    <g id="region-neck" onClick={() => onRegionClick("neck")} className="cursor-pointer">
      <rect x="90" y="58" width="20" height="15" fill="none" stroke="currentColor" strokeWidth="1" rx="3" />
      <rect x="85" y="55" width="30" height="20" fill="transparent" />
    </g>
    {/* Add remaining front-visible regions: shoulder, arm, hand, chest, abdomen, leg, foot */}
    {/* Each follows same pattern: visible shape + transparent hit-area */}
  </>
);
```

Create `BodySvgBack.tsx` with similar structure for back-visible regions.

- [ ] **Step 3: Create AcupointDot component**

```tsx
// src/components/BodySvg/AcupointDot.tsx
"use client";

import type { IAcupoint } from "@/types";

interface IAcupointDotProps {
  acupoint: IAcupoint;
  isHighlighted?: boolean;
  onClick: (id: string) => void;
}

export const AcupointDot = ({ acupoint, isHighlighted, onClick }: IAcupointDotProps) => (
  <g
    onClick={(e) => { e.stopPropagation(); onClick(acupoint.id); }}
    className="cursor-pointer"
    role="button"
    aria-label={acupoint.name.ko}
  >
    <circle
      cx={acupoint.position.x}
      cy={acupoint.position.y}
      r={isHighlighted ? 5 : 3}
      fill={isHighlighted ? "#ef4444" : "#3b82f6"}
      className="transition-all duration-200"
    />
    {isHighlighted && (
      <circle
        cx={acupoint.position.x}
        cy={acupoint.position.y}
        r={8}
        fill="none"
        stroke="#ef4444"
        strokeWidth="1"
        opacity="0.5"
        className="animate-ping"
      />
    )}
  </g>
);
```

- [ ] **Step 4: Create useBodySvg hook**

```typescript
// src/lib/hooks/useBodySvg.ts
import { useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import { BODY_REGIONS, FULL_VIEWBOX } from "@/components/BodySvg/bodyRegions";
import type { BodyPart } from "@/types";

export const useBodySvg = () => {
  const { selectedRegion, isZoomed, bodyView, selectRegion, clearRegion, toggleBodyView } = useAppStore();

  const currentViewBox = isZoomed && selectedRegion
    ? BODY_REGIONS[selectedRegion].viewBox
    : FULL_VIEWBOX;

  const handleRegionClick = useCallback((region: BodyPart) => {
    selectRegion(region);
  }, [selectRegion]);

  const handleZoomOut = useCallback(() => {
    clearRegion();
  }, [clearRegion]);

  return {
    currentViewBox,
    isZoomed,
    bodyView,
    selectedRegion,
    handleRegionClick,
    handleZoomOut,
    toggleBodyView,
  };
};
```

- [ ] **Step 5: Create BodySvgViewer component**

```tsx
// src/components/BodySvg/BodySvgViewer.tsx
"use client";

import { useTranslations } from "next-intl";
import { useBodySvg } from "@/lib/hooks/useBodySvg";
import { BodySvgFront } from "./BodySvgFront";
import { BodySvgBack } from "./BodySvgBack";
import { AcupointDot } from "./AcupointDot";
import { useAppStore } from "@/store/useAppStore";
import { getAcupoints } from "@/lib/utils/data";

interface IBodySvgViewerProps {
  highlightedAcupointIds?: string[];
}

export const BodySvgViewer = ({ highlightedAcupointIds = [] }: IBodySvgViewerProps) => {
  const t = useTranslations("body");
  const { currentViewBox, isZoomed, bodyView, handleRegionClick, handleZoomOut, toggleBodyView } = useBodySvg();
  const { openAcupointDetail, selectedRegion } = useAppStore();

  const acupoints = getAcupoints().filter((a) => {
    if (a.view !== bodyView) return false;
    if (isZoomed && selectedRegion && a.bodyPart !== selectedRegion) return false;
    return isZoomed || highlightedAcupointIds.includes(a.id);
  });

  return (
    <div className="relative flex flex-col items-center px-4">
      <div className="mb-2 flex gap-2">
        <button
          onClick={toggleBodyView}
          className="rounded-full border border-gray-300 px-3 py-1 text-xs"
          aria-label={bodyView === "front" ? t("back") : t("front")}
        >
          {bodyView === "front" ? t("back") : t("front")}
        </button>
        {isZoomed && (
          <button
            onClick={handleZoomOut}
            className="rounded-full border border-gray-300 px-3 py-1 text-xs"
          >
            ← {t("zoomOut")}
          </button>
        )}
      </div>
      <svg
        viewBox={currentViewBox}
        className="h-auto w-full max-w-xs transition-all duration-500 ease-in-out"
        aria-label="Body acupressure map"
      >
        {bodyView === "front"
          ? <BodySvgFront onRegionClick={handleRegionClick} />
          : <BodySvgBack onRegionClick={handleRegionClick} />
        }
        {acupoints.map((a) => (
          <AcupointDot
            key={a.id}
            acupoint={a}
            isHighlighted={highlightedAcupointIds.includes(a.id)}
            onClick={openAcupointDetail}
          />
        ))}
      </svg>
    </div>
  );
};
```

- [ ] **Step 6: Wire BodySvgViewer into BodyPartTab**

```tsx
// src/components/Tabs/BodyPartTab.tsx
"use client";

import { BodySvgViewer } from "@/components/BodySvg/BodySvgViewer";

export const BodyPartTab = () => <BodySvgViewer />;
```

- [ ] **Step 7: Verify SVG renders and click/zoom works**

```bash
npm run dev
```

Expected: Body SVG shows, clicking a region zooms in, toggle switches front/back.

- [ ] **Step 8: Commit**

```bash
git add src/components/BodySvg/ src/lib/hooks/useBodySvg.ts src/components/Tabs/BodyPartTab.tsx
git commit -m "feat: add interactive body SVG viewer with region zoom and acupoint dots"
```

---

## Task 9: Symptom Tab & Search Tab

**Files:**
- Modify: `src/components/Tabs/SymptomTab.tsx`
- Modify: `src/components/Tabs/SearchTab.tsx`
- Create: `src/lib/hooks/useAcupointSearch.ts`
- Create: `src/components/AcupointCard.tsx`

- [ ] **Step 1: Create AcupointCard component**

```tsx
// src/components/AcupointCard.tsx
"use client";

import { useLocale } from "next-intl";
import { getLocalizedText } from "@/lib/utils/locale";
import { getSymptoms } from "@/lib/utils/data";
import type { IAcupoint, Locale } from "@/types";

interface IAcupointCardProps {
  acupoint: IAcupoint;
  onClick: (id: string) => void;
}

export const AcupointCard = ({ acupoint, onClick }: IAcupointCardProps) => {
  const locale = useLocale() as Locale;
  const symptoms = getSymptoms();

  const benefitLabels = acupoint.benefits
    .map((id) => symptoms.find((s) => s.id === id))
    .filter(Boolean)
    .slice(0, 3)
    .map((s) => getLocalizedText(s!.name, locale));

  return (
    <button
      onClick={() => onClick(acupoint.id)}
      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50"
    >
      <div className="flex-1">
        <p className="font-medium">{getLocalizedText(acupoint.name, locale)}</p>
        <p className="text-xs text-gray-500">{acupoint.id} · {acupoint.bodyPart}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {benefitLabels.map((label) => (
            <span key={label} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {label}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
};
```

- [ ] **Step 2: Create useAcupointSearch hook**

```typescript
// src/lib/hooks/useAcupointSearch.ts
import { useState, useEffect, useRef } from "react";
import { searchAcupoints } from "@/lib/utils/data";
import type { IAcupoint } from "@/types";

export const useAcupointSearch = (debounceMs = 300) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(timerRef.current);
  }, [query, debounceMs]);

  const results: IAcupoint[] =
    debouncedQuery.length < 1 ? [] : searchAcupoints(debouncedQuery);

  return { query, setQuery, results };
};
```

- [ ] **Step 3: Implement SymptomTab**

```tsx
// src/components/Tabs/SymptomTab.tsx
"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { getSymptoms } from "@/lib/utils/data";
import { getLocalizedText } from "@/lib/utils/locale";
import { useAppStore } from "@/store/useAppStore";
import { useSetGuideStore } from "@/store/useSetGuideStore";
import { BodySvgViewer } from "@/components/BodySvg/BodySvgViewer";
import type { Locale } from "@/types";
import clsx from "clsx";

export const SymptomTab = () => {
  const locale = useLocale() as Locale;
  const symptoms = getSymptoms();
  const [selectedSymptomId, setSelectedSymptomId] = useState<string | null>(null);
  const { openAcupointDetail } = useAppStore();
  const { startSetGuide } = useSetGuideStore();

  const selectedSymptom = symptoms.find((s) => s.id === selectedSymptomId);

  const handleSymptomClick = (symptomId: string) => {
    const symptom = symptoms.find((s) => s.id === symptomId);
    if (!symptom) return;
    setSelectedSymptomId(symptomId);
    startSetGuide(symptomId, symptom.acupointIds);
    if (symptom.acupointIds.length > 0) {
      openAcupointDetail(symptom.acupointIds[0]);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 px-4 py-2">
        {symptoms.map((symptom) => (
          <button
            key={symptom.id}
            onClick={() => handleSymptomClick(symptom.id)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm transition-colors",
              selectedSymptomId === symptom.id
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-50"
            )}
          >
            {getLocalizedText(symptom.name, locale)}
          </button>
        ))}
      </div>
      <BodySvgViewer
        highlightedAcupointIds={selectedSymptom?.acupointIds ?? []}
      />
    </div>
  );
};
```

- [ ] **Step 4: Implement SearchTab**

```tsx
// src/components/Tabs/SearchTab.tsx
"use client";

import { useTranslations } from "next-intl";
import { useAcupointSearch } from "@/lib/hooks/useAcupointSearch";
import { useAppStore } from "@/store/useAppStore";
import { AcupointCard } from "@/components/AcupointCard";

export const SearchTab = () => {
  const t = useTranslations("search_page");
  const { query, setQuery, results } = useAcupointSearch();
  const { openAcupointDetail } = useAppStore();

  return (
    <div className="px-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("placeholder")}
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
        aria-label={t("placeholder")}
      />
      <div className="mt-3 flex flex-col gap-2">
        {query.length > 0 && results.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-500">
            <p>{t("empty")}</p>
            <p className="mt-1 text-xs">{t("suggestion")}</p>
          </div>
        )}
        {results.map((a) => (
          <AcupointCard key={a.id} acupoint={a} onClick={openAcupointDetail} />
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Verify all three tabs work**

```bash
npm run dev
```

Expected: Body tab shows SVG, Symptom tab shows chips + highlights, Search tab filters acupoints.

- [ ] **Step 6: Commit**

```bash
git add src/components/Tabs/ src/components/AcupointCard.tsx src/lib/hooks/useAcupointSearch.ts
git commit -m "feat: add symptom tab with chips and search tab with debounced filtering"
```

---

## Task 10: Bottom Sheet & Acupoint Detail

**Files:**
- Create: `src/components/BottomSheet/BottomSheet.tsx`
- Create: `src/components/BottomSheet/AcupointDetail.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create generic BottomSheet component**

```tsx
// src/components/BottomSheet/BottomSheet.tsx
"use client";

import { useEffect, useCallback } from "react";
import clsx from "clsx";

interface IBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const BottomSheet = ({ isOpen, onClose, children }: IBottomSheetProps) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          "fixed inset-0 z-40 bg-black/30 transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          "fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-2xl bg-white shadow-xl",
          "transition-transform duration-300 ease-out",
          "max-h-[85vh] overflow-y-auto",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-2">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>
        {children}
      </div>
    </>
  );
};
```

- [ ] **Step 2: Create AcupointDetail component**

```tsx
// src/components/BottomSheet/AcupointDetail.tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { useAppStore } from "@/store/useAppStore";
import { useSetGuideStore } from "@/store/useSetGuideStore";
import { getAcupointById, getSymptoms } from "@/lib/utils/data";
import { getLocalizedText } from "@/lib/utils/locale";
import { BODY_REGIONS } from "@/components/BodySvg/bodyRegions";
import { BodySvgFront } from "@/components/BodySvg/BodySvgFront";
import { BodySvgBack } from "@/components/BodySvg/BodySvgBack";
import { AcupointDot } from "@/components/BodySvg/AcupointDot";
import type { Locale } from "@/types";
import { useRouter } from "next/navigation";

// Note: AcupressureTimer is imported in Task 11. Until then, use a placeholder div.
// After Task 11, replace placeholder with:
// import { AcupressureTimer } from "@/components/Timer/AcupressureTimer";

export const AcupointDetail = () => {
  const locale = useLocale() as Locale;
  const t = useTranslations("detail");
  const router = useRouter();
  const { user } = useAuth();
  const { selectedAcupointId } = useAppStore();
  const { symptomId, acupointIds, currentIndex, goToNext, goToPrevious, timerDuration, setTimerDuration } = useSetGuideStore();

  if (!selectedAcupointId) return null;

  const acupoint = getAcupointById(selectedAcupointId);
  if (!acupoint) return null;

  const symptoms = getSymptoms();
  const currentSymptom = symptomId ? symptoms.find((s) => s.id === symptomId) : null;
  const isInSet = !!currentSymptom && acupointIds.length > 0;

  const benefitLabels = acupoint.benefits
    .map((id) => symptoms.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined)
    .map((s) => getLocalizedText(s.name, locale));

  const handleFavoriteToggle = () => {
    if (!user) {
      router.push(`/login?next=/`);
      return;
    }
    // TODO: implement favorite toggle with useFavorites hook (Task 12)
  };

  const handleSetNavigate = (direction: "next" | "prev") => {
    const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    const newId = acupointIds[newIndex];
    if (!newId) return;
    if (direction === "next") goToNext();
    else goToPrevious();
    useAppStore.getState().openAcupointDetail(newId);
  };

  // Zoomed SVG viewBox for this acupoint's body region
  const regionBounds = BODY_REGIONS[acupoint.bodyPart];

  return (
    <div className="px-4 pb-6">
      {/* Set navigation */}
      {isInSet && (
        <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
          <button
            onClick={() => handleSetNavigate("prev")}
            disabled={currentIndex === 0}
            className="disabled:opacity-30"
          >
            {t("prev")}
          </button>
          <span className="font-semibold text-blue-600">
            {getLocalizedText(currentSymptom!.name, locale)} {currentIndex + 1}/{acupointIds.length}
          </span>
          <button
            onClick={() => handleSetNavigate("next")}
            disabled={currentIndex === acupointIds.length - 1}
            className="disabled:opacity-30"
          >
            {t("next")}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{getLocalizedText(acupoint.name, locale)} ({acupoint.id})</h2>
          <p className="text-sm text-gray-500">
            {locale === "ko" ? acupoint.name.en : acupoint.name.ko} · {acupoint.bodyPart}
          </p>
        </div>
        <button onClick={handleFavoriteToggle} className="text-2xl" aria-label="Toggle favorite">
          ♡
        </button>
      </div>

      {/* Zoomed body part SVG */}
      <div className="mb-3 flex justify-center rounded-lg bg-gray-50 p-3">
        <svg viewBox={regionBounds.viewBox} className="h-36 w-auto">
          {acupoint.view === "front"
            ? <BodySvgFront onRegionClick={() => {}} />
            : <BodySvgBack onRegionClick={() => {}} />
          }
          <AcupointDot acupoint={acupoint} isHighlighted onClick={() => {}} />
        </svg>
      </div>

      {/* Benefits */}
      <div className="mb-3">
        <h3 className="mb-1 text-sm font-bold">{t("benefits")}</h3>
        <div className="flex flex-wrap gap-1">
          {benefitLabels.map((label) => (
            <span key={label} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Technique */}
      <div className="mb-4">
        <h3 className="mb-1 text-sm font-bold">{t("technique")}</h3>
        <p className="text-sm text-gray-700">{getLocalizedText(acupoint.technique, locale)}</p>
      </div>

      {/* Timer placeholder — replaced with AcupressureTimer in Task 11 */}
      <div className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
        {t("timer")} (Task 11에서 구현)
      </div>

      {/* YouTube video — hidden until videoUrl exists */}
      {acupoint.videoUrl && (
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-bold">{t("video")}</h3>
          <iframe
            src={acupoint.videoUrl.replace("watch?v=", "embed/")}
            className="aspect-video w-full rounded-lg"
            allowFullScreen
            title={getLocalizedText(acupoint.name, locale)}
          />
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Wire BottomSheet into main page**

Update `src/app/page.tsx` to include:

```tsx
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { AcupointDetail } from "@/components/BottomSheet/AcupointDetail";

// Inside component:
const { isBottomSheetOpen, closeBottomSheet } = useAppStore();

// In JSX:
<BottomSheet isOpen={isBottomSheetOpen} onClose={closeBottomSheet}>
  <AcupointDetail />
</BottomSheet>
```

- [ ] **Step 4: Verify bottom sheet opens on acupoint click**

```bash
npm run dev
```

Expected: Clicking an acupoint dot opens the bottom sheet with details.

- [ ] **Step 5: Commit**

```bash
git add src/components/BottomSheet/ src/app/page.tsx
git commit -m "feat: add bottom sheet with acupoint detail, set navigation, and favorite toggle"
```

---

## Task 11: Acupressure Timer

**Files:**
- Create: `src/components/Timer/AcupressureTimer.tsx`
- Create: `src/lib/hooks/useTimer.ts`
- Create: `src/lib/hooks/__tests__/useTimer.test.ts`
- Modify: `src/components/BottomSheet/AcupointDetail.tsx` (replace timer placeholder)

- [ ] **Step 0: Install testing-library dependencies**

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 1: Write timer hook tests**

```typescript
// src/lib/hooks/__tests__/useTimer.test.ts
import { renderHook, act } from "@testing-library/react";
import { useTimer } from "../useTimer";

// Install: npm install --save-dev @testing-library/react @testing-library/jest-dom

describe("useTimer", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("should initialize with given duration", () => {
    const { result } = renderHook(() => useTimer(20));
    expect(result.current.timeLeft).toBe(20);
    expect(result.current.isRunning).toBe(false);
  });

  it("should count down when started", () => {
    const { result } = renderHook(() => useTimer(10));
    act(() => result.current.start());
    expect(result.current.isRunning).toBe(true);
    act(() => jest.advanceTimersByTime(3000));
    expect(result.current.timeLeft).toBe(7);
  });

  it("should pause", () => {
    const { result } = renderHook(() => useTimer(10));
    act(() => result.current.start());
    act(() => jest.advanceTimersByTime(3000));
    act(() => result.current.pause());
    expect(result.current.isRunning).toBe(false);
    expect(result.current.timeLeft).toBe(7);
  });

  it("should reset to given duration", () => {
    const { result } = renderHook(() => useTimer(10));
    act(() => result.current.start());
    act(() => jest.advanceTimersByTime(5000));
    act(() => result.current.reset(20));
    expect(result.current.timeLeft).toBe(20);
    expect(result.current.isRunning).toBe(false);
  });

  it("should call onComplete when reaching 0", () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useTimer(3, onComplete));
    act(() => result.current.start());
    act(() => jest.advanceTimersByTime(3000));
    expect(result.current.timeLeft).toBe(0);
    expect(result.current.isRunning).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/lib/hooks/__tests__/useTimer.test.ts --verbose
```

Expected: FAIL — useTimer not found.

- [ ] **Step 3: Implement useTimer hook**

```typescript
// src/lib/hooks/useTimer.ts
import { useState, useRef, useCallback, useEffect } from "react";

export const useTimer = (initialDuration: number, onComplete?: () => void) => {
  const [timeLeft, setTimeLeft] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (timeLeft <= 0) return;
    setIsRunning(true);
    clearTimer();
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [timeLeft, clearTimer, onComplete]);

  const pause = useCallback(() => {
    setIsRunning(false);
    clearTimer();
  }, [clearTimer]);

  const reset = useCallback((duration: number) => {
    clearTimer();
    setIsRunning(false);
    setTimeLeft(duration);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return { timeLeft, isRunning, start, pause, reset };
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/lib/hooks/__tests__/useTimer.test.ts --verbose
```

Expected: All tests pass.

- [ ] **Step 5: Create AcupressureTimer component**

```tsx
// src/components/Timer/AcupressureTimer.tsx
"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useTimer } from "@/lib/hooks/useTimer";
import clsx from "clsx";

interface IAcupressureTimerProps {
  initialDuration: number;
  onDurationChange: (duration: number) => void;
}

const PRESETS = [10, 20, 30];
const MIN_DURATION = 5;
const MAX_DURATION = 120;
const STEP = 5;

export const AcupressureTimer = ({ initialDuration, onDurationChange }: IAcupressureTimerProps) => {
  const t = useTranslations("detail");
  const [duration, setDuration] = useState(initialDuration);
  const [isEditing, setIsEditing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleComplete = useCallback(() => {
    setIsComplete(true);
    if (navigator.vibrate) navigator.vibrate(200);
    setTimeout(() => setIsComplete(false), 2000);
  }, []);

  const { timeLeft, isRunning, start, pause, reset } = useTimer(duration, handleComplete);

  const handleDurationChange = (newDuration: number) => {
    const clamped = Math.max(MIN_DURATION, Math.min(MAX_DURATION, newDuration));
    setDuration(clamped);
    onDurationChange(clamped);
    reset(clamped);
  };

  const handleDirectInput = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) handleDurationChange(num);
    setIsEditing(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className={clsx(
      "rounded-xl bg-gray-50 p-4 text-center",
      isComplete && "animate-pulse bg-green-50"
    )}>
      <h3 className="mb-2 text-xs font-bold">{t("timer")}</h3>

      {/* Presets */}
      <div className="mb-3 flex justify-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => handleDurationChange(p)}
            className={clsx(
              "rounded-full px-3.5 py-1 text-xs",
              duration === p && !isRunning
                ? "bg-blue-600 text-white"
                : "border border-gray-300"
            )}
          >
            {p}{t("seconds")}
          </button>
        ))}
      </div>

      {/* Adjustment buttons + display */}
      <div className="mb-3 flex items-center justify-center gap-4">
        <button
          onClick={() => handleDurationChange(duration - STEP)}
          disabled={isRunning || duration <= MIN_DURATION}
          className="rounded-full border border-gray-300 px-3 py-1 text-lg disabled:opacity-30"
          aria-label="Decrease duration"
        >
          −
        </button>

        {isEditing ? (
          <input
            type="number"
            defaultValue={duration}
            onBlur={(e) => handleDirectInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleDirectInput((e.target as HTMLInputElement).value)}
            autoFocus
            className="w-20 rounded border border-blue-500 text-center text-3xl font-bold"
            min={MIN_DURATION}
            max={MAX_DURATION}
          />
        ) : (
          <button
            onClick={() => !isRunning && setIsEditing(true)}
            className="text-4xl font-bold tracking-wider"
            aria-label="Edit timer duration"
          >
            {formatTime(timeLeft)}
          </button>
        )}

        <button
          onClick={() => handleDurationChange(duration + STEP)}
          disabled={isRunning || duration >= MAX_DURATION}
          className="rounded-full border border-gray-300 px-3 py-1 text-lg disabled:opacity-30"
          aria-label="Increase duration"
        >
          +
        </button>
      </div>

      {/* Start/Pause */}
      <button
        onClick={isRunning ? pause : start}
        className="rounded-full bg-blue-600 px-8 py-2 text-sm font-bold text-white hover:bg-blue-700"
      >
        {isRunning ? t("pause") : t("start")}
      </button>
    </div>
  );
};
```

- [ ] **Step 6: Integrate timer into AcupointDetail**

Update `src/components/BottomSheet/AcupointDetail.tsx`:
- Replace the timer placeholder `<div>` with actual `<AcupressureTimer>` component
- Add import: `import { AcupressureTimer } from "@/components/Timer/AcupressureTimer";`
- Remove the placeholder comment

- [ ] **Step 7: Verify timer works end to end**

```bash
npm run dev
```

Expected: Timer shows in bottom sheet. Presets, ±, direct input, start/pause, and completion animation all work.

- [ ] **Step 8: Commit**

```bash
git add src/components/Timer/ src/lib/hooks/useTimer.ts src/lib/hooks/__tests__/ src/components/BottomSheet/AcupointDetail.tsx
git commit -m "feat: add acupressure timer with presets, adjustments, direct input, and completion feedback"
```

---

## Task 12: Favorites (Supabase)

**Files:**
- Create: `src/lib/hooks/useFavorites.ts`
- Create: `src/app/favorites/page.tsx`
- Modify: `src/components/BottomSheet/AcupointDetail.tsx`

- [ ] **Step 1: Create Supabase favorites table**

SQL to run in Supabase dashboard:

```sql
CREATE TABLE favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  acupoint_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, acupoint_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON favorites
  FOR DELETE USING (auth.uid() = user_id);
```

- [ ] **Step 2: Create useFavorites hook**

```typescript
// src/lib/hooks/useFavorites.ts

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

export const useFavorites = () => {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setFavoriteIds([]);
      return;
    }
    const fetchFavorites = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("favorites")
        .select("acupoint_id")
        .eq("user_id", user.id);
      setFavoriteIds(data?.map((f) => f.acupoint_id) ?? []);
      setIsLoading(false);
    };
    fetchFavorites();
  }, [user]);

  const toggleFavorite = useCallback(async (acupointId: string) => {
    if (!user) return;
    const supabase = createClient();
    const isFavorited = favoriteIds.includes(acupointId);

    // Optimistic update
    setFavoriteIds((prev) =>
      isFavorited ? prev.filter((id) => id !== acupointId) : [...prev, acupointId]
    );

    if (isFavorited) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("acupoint_id", acupointId);
    } else {
      await supabase
        .from("favorites")
        .insert({ user_id: user.id, acupoint_id: acupointId });
    }
  }, [user, favoriteIds]);

  const isFavorite = useCallback(
    (acupointId: string) => favoriteIds.includes(acupointId),
    [favoriteIds]
  );

  return { favoriteIds, isLoading, toggleFavorite, isFavorite };
};
```

- [ ] **Step 3: Update AcupointDetail to use useFavorites**

Replace the TODO favorite toggle in `AcupointDetail.tsx` with actual `useFavorites` hook usage. Change heart icon to filled (♥) when favorited.

- [ ] **Step 4: Create favorites page**

```tsx
// src/app/favorites/page.tsx
"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { getAcupointById } from "@/lib/utils/data";
import { AcupointCard } from "@/components/AcupointCard";
import type { IAcupoint } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function FavoritesPage() {
  const t = useTranslations("favorites_page");
  const { user, isLoading: authLoading } = useAuth();
  const { favoriteIds, isLoading } = useFavorites();
  const { openAcupointDetail } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?next=/favorites");
    }
  }, [user, authLoading, router]);

  if (authLoading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  const favoriteAcupoints = favoriteIds
    .map((id) => getAcupointById(id))
    .filter((a): a is IAcupoint => a !== undefined);

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-20 pt-6">
      <h1 className="mb-4 text-xl font-bold">{t("title") ?? "즐겨찾기"}</h1>
      {favoriteAcupoints.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          <p>{t("empty")}</p>
          <Link href="/" className="mt-2 inline-block text-blue-600 underline">
            {t("goHome")}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {favoriteAcupoints.map((a) => (
            <AcupointCard key={a.id} acupoint={a} onClick={openAcupointDetail} />
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Verify favorites flow**

```bash
npm run dev
```

Expected: Heart toggles favorite, favorites page shows saved acupoints, unauthenticated users redirected to login.

- [ ] **Step 6: Commit**

```bash
git add src/lib/hooks/useFavorites.ts src/app/favorites/ src/components/BottomSheet/AcupointDetail.tsx
git commit -m "feat: add favorites with Supabase, optimistic UI, and favorites page"
```

---

## Task 13: Full Acupoint Data Population

**Files:**
- Modify: `src/data/acupoints.json`
- Modify: `src/data/symptoms.json`

- [ ] **Step 1: Research and populate acupoint data**

Expand `acupoints.json` with real acupressure point data. Target at least 30-40 common acupoints across all 12 body parts, covering all 16 MVP symptoms. Each acupoint needs accurate:
- ID (standard TCM coding: LI4, ST36, etc.)
- Korean and English names
- Body part and view (front/back)
- Position coordinates (approximate, adjusted to SVG layout)
- Benefits (symptom IDs)
- Technique description in both languages

- [ ] **Step 2: Populate symptom acupointIds**

Update `symptoms.json` so every symptom's `acupointIds` references the correct acupoints. Ensure bidirectional consistency.

- [ ] **Step 3: Run data validation tests**

```bash
npx jest src/lib/utils/__tests__/data.test.ts --verbose
```

Expected: All tests pass with expanded data.

- [ ] **Step 4: Commit**

```bash
git add src/data/
git commit -m "feat: populate acupoint and symptom data for all 16 MVP symptoms"
```

---

## Task 14: SVG Illustrations

**Files:**
- Modify: `src/components/BodySvg/BodySvgFront.tsx`
- Modify: `src/components/BodySvg/BodySvgBack.tsx`
- Modify: `src/components/BodySvg/bodyRegions.ts`

- [ ] **Step 1: Create or source SVG body illustrations**

Replace placeholder shapes with actual simple line-art SVG illustrations of the human body (front and back views). Options:
- Create manually in Figma/Illustrator and export as SVG paths
- Use open-source SVG body illustrations and adapt

Ensure each body region is wrapped in a `<g id="region-{bodyPart}">` group.

- [ ] **Step 2: Update viewBox coordinates**

Adjust `bodyRegions.ts` coordinates to match the actual SVG illustrations. Test each region zoom to verify correct framing.

- [ ] **Step 3: Update acupoint positions**

Adjust `acupoints.json` position coordinates to match the actual SVG coordinate system.

- [ ] **Step 4: Visual QA all regions and acupoints**

Navigate every body region, verify every acupoint dot is positioned correctly on both front and back views.

- [ ] **Step 5: Commit**

```bash
git add src/components/BodySvg/ src/data/acupoints.json
git commit -m "feat: add body SVG illustrations with accurate region and acupoint positioning"
```

---

## Task 15: Build Verification & Cleanup

**Files:**
- Modify: various cleanup

- [ ] **Step 1: Run all tests**

```bash
npx jest --verbose
```

Expected: All tests pass.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: No lint errors.

- [ ] **Step 4: Remove console.log and TODOs**

Search for any remaining `console.log` or `TODO` comments and clean up.

- [ ] **Step 5: Add .gitignore entries**

Ensure `.superpowers/`, `.env.local`, `node_modules/` are in `.gitignore`.

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "chore: build verification and cleanup"
```

---

## Task Summary

| # | Task | Dependencies |
|---|------|-------------|
| 1 | Project Scaffolding | — |
| 2 | Type Definitions & Static Data | 1 |
| 3 | Zustand Stores | 1 |
| 4 | i18n Setup (next-intl) | 1 |
| 5 | Supabase Setup & Auth | 1 |
| 6 | Bottom Navigation & App Shell | 4, 5 |
| 7 | Top Tab Bar & Tab Structure | 3, 6 |
| 8 | Body SVG Components | 2, 3, 7 |
| 9 | Symptom Tab & Search Tab | 2, 8 |
| 10 | Bottom Sheet & Acupoint Detail | 8, 9 |
| 11 | Acupressure Timer | 10 |
| 12 | Favorites (Supabase) | 5, 10 |
| 13 | Full Data Population | 2 |
| 14 | SVG Illustrations | 8 |
| 15 | Build Verification & Cleanup | all |
