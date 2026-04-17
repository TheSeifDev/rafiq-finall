# رفيق — Rafiq App 🏥

> A smart Arabic-first mobile health companion for patients and caregivers.

---

## 🚀 Overview

**Rafiq** (رفيق — meaning "companion" in Arabic) is a cross-platform mobile health application built with Expo and React Native. It's designed for Arabic-speaking patients and their families to monitor vital signs, manage medications, handle emergencies, and communicate through an AI-assisted chat — all from one place.

The app features a complete authentication flow, a patient onboarding step, real-time vital sign monitoring via Supabase, smart notifications with live push badges, and a clean dark/light UI system that's fully RTL-ready.

---

## 🧠 Features

- **🔐 Auth Flow** — Secure sign-up, sign-in, and session persistence via Supabase Auth + AsyncStorage
- **🧾 Patient Onboarding** — First-time users must register patient profile info (name, age, gender, blood type) before accessing the app
- **❤️ Vital Signs Monitoring** — Real-time heart rate, oxygen level, and blood pressure tracking from the `patient_health` and `vitals` Supabase tables
- **💊 Medication Manager** — Add, toggle active state, and delete medication reminders
- **🚨 Emergency Center** — One-tap ambulance call (997), nearby hospital lookup, first aid guide, and video consultation cards
- **🔔 Smart Notifications** — Real-time Supabase Realtime listener for new notification inserts; bell icon shows badge dynamically
- **💬 Chat Screen** — Dedicated chat interface (AI assistant flow)
- **👤 Profile & Settings** — View patient profile info; toggle dark/light mode via `GeneralSettings`
- **🌗 Dark/Light Theme** — Full dark mode support across all screens, driven by `ThemeContext`
- **📐 RTL Layout** — Arabic-first UI using `flexDirection: 'row-reverse'` and right-aligned text throughout
- **🧭 Typed Navigation** — Full stack + tab navigation with typed param lists using React Navigation

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React Native 0.81 + Expo ~54 |
| **Language** | TypeScript |
| **Backend / Auth / DB** | Supabase (Auth, Postgres, Realtime) |
| **Navigation** | React Navigation (Bottom Tabs + Native Stack) |
| **Icons** | `@expo/vector-icons` (MaterialCommunityIcons) |
| **State Management** | React Context + `useReducer` |
| **Session Storage** | AsyncStorage (`@react-native-async-storage/async-storage`) |
| **Styling** | React Native `StyleSheet` + NativeWind (configured but minimal usage) |
| **Animations** | React Native Animated API |
| **Build Tool** | Expo CLI / Metro Bundler |

---

## 📁 Project Structure

```
rafiq-app/
├── App.tsx                      # Legacy root entry (older version)
├── index.ts                     # Actual Expo entry point
├── lib/
│   └── supabase.ts              # Legacy Supabase client (used by old screens)
├── components/
│   └── Auth.tsx                 # Legacy auth form (superseded)
├── assets/                      # Images and static assets
├── src/
│   ├── components/
│   │   └── ui/                  # Shared UI components (Screen, LoadingOverlay, etc.)
│   ├── context/
│   │   └── ThemeContext.tsx      # Duplicate ThemeContext (see ⚠️ Known Issues)
│   ├── store/
│   │   ├── AuthContext.tsx       # Auth state: useReducer + Supabase session
│   │   └── ThemeContext.tsx      # Canonical ThemeContext with dark/light toggle
│   ├── services/
│   │   ├── supabase.ts           # Current Supabase client (with env guard)
│   │   ├── auth.service.ts       # Wraps all Supabase auth methods
│   │   ├── patient.service.ts    # CRUD for patients table
│   │   ├── vitals.service.ts     # Vitals history + Realtime subscription
│   │   └── medication.service.ts # Medication CRUD operations
│   ├── navigation/
│   │   ├── AppNavigator.tsx      # Root: Auth → AddPatient → Main flow
│   │   ├── AuthNavigator.tsx     # Welcome / Login / SignUp stack
│   │   ├── MainNavigator.tsx     # Bottom tab navigator (5 tabs)
│   │   └── routes.ts             # Centralized route name constants
│   ├── screens/
│   │   ├── HomeScreen.tsx        # Dashboard with ECG card + quick actions
│   │   ├── DashboardScreen.tsx   # Alternative dashboard view (not in nav)
│   │   ├── LoginScreen.tsx       # Login UI (uses legacy supabase client)
│   │   ├── SignUpScreen.tsx      # Registration form
│   │   ├── WelcomeScreen.tsx     # Onboarding splash
│   │   ├── AddPatientScreen.tsx  # Patient profile registration
│   │   ├── VitalsScreen.tsx      # Vitals history list
│   │   ├── MedicationScreen.tsx  # Medication management
│   │   ├── EmergencyCenter.tsx   # Emergency services hub
│   │   ├── ChatScreen.tsx        # Chat interface
│   │   ├── NotificationsScreen.tsx # Notifications list
│   │   ├── ProfileScreen.tsx     # User profile display
│   │   ├── SettingsScreen.tsx    # Settings menu
│   │   └── GeneralSettingsScreen.tsx # Dark mode toggle + preferences
│   ├── theme/
│   │   ├── colors.ts             # Color palette (primary, status, accent)
│   │   ├── typography.ts         # Font sizes and weights
│   │   ├── spacing.ts            # Spacing and border radius tokens
│   │   ├── shadows.ts            # Elevation/shadow presets
│   │   └── index.ts              # Exports lightTheme / darkTheme / ThemeColors
│   └── types/
│       ├── database.ts           # TypeScript interfaces for DB entities
│       └── navigation.ts         # Typed param lists for all navigators
├── .env                          # Environment variables (DO NOT COMMIT)
├── package.json
└── tsconfig.json
```

---

## ⚙️ Installation

### Prerequisites
- Node.js ≥ 18
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- A Supabase project with the required tables (see [Database Schema](#-database-schema))

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/your-username/rafiq-app.git
cd rafiq-app

# 2. Install dependencies
npm install

# 3. Create your .env file
cp .env.example .env
# Then fill in your Supabase credentials (see Environment Variables below)
```

---

## ▶️ Usage

```bash
# Start the Expo dev server
npx expo start

# Run on Android emulator
npx expo start --android

# Run on iOS simulator
npx expo start --ios

# Run in browser (limited support)
npx expo start --web
```

Scan the QR code with **Expo Go** on your physical device, or press `a` / `i` in the terminal.

---

## 🔐 Environment Variables

Create a `.env` file in the root of the project:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project API URL (found in Project Settings → API) |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your Supabase publishable/anon key |

> ⚠️ **Never commit your `.env` file.** Make sure `.env` is listed in `.gitignore`.

---

## 🗄 Database Schema

The app expects these tables in your Supabase Postgres database:

### `patients`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | Foreign key → `auth.users` |
| `full_name` | text | |
| `age` | int | |
| `gender` | text | `'male'` or `'female'` |
| `blood_type` | text | e.g. `'A+'` |
| `allergies` | text | Nullable |
| `created_at` | timestamp | |

### `patient_health`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `patient_id` | uuid | Foreign key → `patients` |
| `heart_rate` | int | |
| `oxygen_level` | float | Nullable |
| `blood_pressure` | text | e.g. `'120/80'` |
| `temperature` | float | Nullable |
| `created_at` | timestamp | |

### `vitals`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `user_id` | uuid | |
| `heart_rate` | int | |
| `oxygen_level` | float | Nullable |
| `blood_pressure_systolic` | int | Nullable |
| `blood_pressure_diastolic` | int | Nullable |
| `created_at` | timestamp | |

### `medications`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `patient_id` | uuid | |
| `med_name` | text | |
| `dosage` | text | |
| `reminder_time` | text | e.g. `'08:00 AM'` |
| `is_active` | boolean | |
| `created_at` | timestamp | |

### `notifications`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `user_id` | uuid | |
| `title` | text | |
| `body` | text | |
| `type` | text | `'critical'`, `'reminder'`, `'general'` |
| `is_read` | boolean | |
| `created_at` | timestamp | |

> Don't forget to enable **Row Level Security (RLS)** on all tables and create appropriate policies so users can only access their own data.

---

## 📡 API / Service Layer

The app communicates with Supabase through dedicated service modules in `src/services/`:

### Auth (`auth.service.ts`)
| Method | Description |
|---|---|
| `signIn({ email, password })` | Sign in with email/password |
| `signUp({ email, password, fullName })` | Register new user |
| `signOut()` | Sign out current user |
| `getSession()` | Get current session |
| `getUser()` | Verify and fetch current user from server |
| `resetPassword(email)` | Send password reset email |
| `onAuthStateChange(callback)` | Subscribe to auth state changes |

### Patient (`patient.service.ts`)
| Method | Description |
|---|---|
| `hasPatient(userId)` | Check if user has a registered patient profile |
| `getPatient(userId)` | Fetch full patient record |
| `getProfile(userId)` | Fetch display profile (name, age, blood type, allergies) |
| `getUserName(userId)` | Fetch patient's full name only |
| `createPatient(data)` | Insert new patient record |
| `getPatientId(userId)` | Get patient UUID for use in related queries |

### Vitals (`vitals.service.ts`)
| Method | Description |
|---|---|
| `getLastHeartRate(userId)` | Fetch the most recent heart rate reading |
| `getVitalsHistory(patientId)` | Fetch full vitals history for a patient |
| `subscribeToNotifications(callback)` | Realtime listener for new notification inserts |

### Medication (`medication.service.ts`)
| Method | Description |
|---|---|
| `getMedications(patientId)` | Fetch all medications sorted by reminder time |
| `addMedication(data)` | Add a new medication |
| `toggleMedication(id, isActive)` | Toggle a medication's active state |
| `deleteMedication(id)` | Delete a medication by ID |

---

## 📸 Screenshots

> *(Add screenshots to an `/assets/screenshots/` folder and link them here)*

| Welcome | Login | Home |
|---|---|---|
| `[welcome.png]` | `[login.png]` | `[home.png]` |

| Vitals | Emergency | Medications |
|---|---|---|
| `[vitals.png]` | `[emergency.png]` | `[medication.png]` |

---

## ⚠️ Known Issues

### 🔴 Critical

1. **Duplicate `ThemeContext`** — There are two different `ThemeContext.tsx` files: one at `src/store/ThemeContext.tsx` (correct, canonical) and another at `src/context/ThemeContext.tsx` (legacy). Several older screens import from the legacy path (`../context/ThemeContext`), while newer ones import from `../store/ThemeContext`. This will cause subtle bugs — a theme toggle in one context won't affect screens reading the other.

2. **Duplicate `supabase` clients** — `lib/supabase.ts` (root) and `src/services/supabase.ts` are two separate Supabase client instances. Older screens (`LoginScreen`, `HomeScreen`, `SignUpScreen`) import from the root `lib/supabase`, bypassing the service layer entirely. This means auth events from those screens may not be picked up by the `AuthContext` listener.

3. **`HomeScreen` has an interface declared inside a function body** — `interface HomeProps` is declared twice (line 18 and line 99 inside the component body). This is a TypeScript syntax error that TypeScript may silently allow in some configs but indicates a copy-paste artifact that should be cleaned up.

4. **`DashboardScreen.tsx` references `colors.subText`** — but `ThemeColors` in `src/theme/index.ts` does not define a `subText` key. This will cause a TypeScript error and a runtime crash on any screen using `DashboardScreen`.

### 🟡 Moderate

5. **`rememberMe` state in `LoginScreen` is non-functional** — The toggle exists in the UI but has no effect on session persistence behavior.

6. **"Forgot Password" button is a no-op** — The `TouchableOpacity` wrapping "نسيت كلمة المرور؟" has no `onPress` handler. `auth.service.ts` has a `resetPassword` method ready but it's never called.

7. **`EmergencyCenter` is dark-mode-only** — Its styles are hardcoded to dark colors (`#0A0E17`, `#161B26`) and don't respect the theme system. It will look broken in light mode.

8. **`AddPatientScreen` rendered outside `NavigationContainer`** — In `AppNavigator.tsx`, when `!hasPatient`, `AddPatientScreen` is rendered directly without being inside a stack navigator. This means it cannot use `useNavigation()` or receive screen props from the navigator.

### 🟢 Minor

9. **No `.env.example` file** — New developers have no template to know which variables are required.

10. **`translations.ts` exists but appears unused** — There's a `src/constants/translations.ts` file with no evidence of it being imported anywhere.

11. **NativeWind / TailwindCSS is configured but unused** — `global.css`, `postcss.config.mjs`, and the NativeWind package are set up, but all styling uses `StyleSheet.create`. The tooling adds build overhead with zero benefit.

---

## 💡 Improvements

- **Unify the Supabase client** into a single export from `src/services/supabase.ts` and update all imports across the project.
- **Merge the two `ThemeContext` files** — keep only `src/store/ThemeContext.tsx` and do a global find-and-replace on all imports.
- **Add a `ThemeAwareScreen` wrapper** for `EmergencyCenter` and other screens that hardcode dark colors.
- **Implement the Forgot Password flow** by wiring `auth.service.resetPassword()` to the existing button in `LoginScreen`.
- **Wrap `AddPatientScreen` in its own Stack Navigator** inside `AppNavigator` so it can use navigation hooks properly.
- **Add form validation** (e.g., with Zod + React Hook Form) on Login, SignUp, and AddPatient screens instead of bare `Alert` calls.
- **Add push notification support** via `expo-notifications` to complement the existing Realtime badge listener.
- **Introduce an i18n library** (e.g., `expo-localization` + `i18next`) instead of hardcoded Arabic strings scattered across every screen.

---

## 🏗 Implementation Suggestions

Here's a realistic, prioritized action plan to stabilize and scale the project:

### Phase 1 — Stabilize the core (Do this first)
1. **Fix the dual Supabase client issue.** Delete `lib/supabase.ts`, update all imports to `src/services/supabase.ts`.
2. **Fix the dual ThemeContext issue.** Remove `src/context/ThemeContext.tsx`, update all imports to `src/store/ThemeContext.tsx`.
3. **Add `subText` to `ThemeColors`** in `src/theme/index.ts` (or remove all references to it).
4. **Fix `HomeScreen.tsx`** — remove the duplicate `interface HomeProps` declaration inside the component body.

### Phase 2 — UX polish
5. **Migrate `LoginScreen` and `SignUpScreen`** to use `AuthContext` (`useAuth()`) instead of calling the Supabase client directly.
6. **Wire up "Forgot Password"** to `authService.resetPassword(email)`.
7. **Apply theme system to `EmergencyCenter`** using `useTheme()`.
8. **Wrap `AddPatientScreen`** in a proper navigator in `AppNavigator`.

### Phase 3 — Feature completeness
9. **Implement the Chat screen** with a real AI backend (e.g., Supabase Edge Function + OpenAI).
10. **Add vitals input form** so users can log heart rate / blood pressure from within the app (not just view historical data).
11. **Add push notifications** via `expo-notifications` — store tokens in a `push_tokens` table and trigger from Supabase Edge Functions.

### Phase 4 — Quality & scale
12. **Add a test suite** using Jest + React Native Testing Library.
13. **Set up EAS Build** (`eas.json`) for production iOS/Android builds.
14. **Set up `eas update`** for OTA (over-the-air) updates without going through app store review every time.
15. **Create `.env.example`** and document all required variables in onboarding docs.

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and ensure the app runs without errors
4. Commit your changes: `git commit -m 'feat: add your feature'`
5. Push to your fork: `git push origin feature/your-feature-name`
6. Open a Pull Request and describe what you changed and why

Please follow the existing code style (TypeScript, named exports for components, service pattern for Supabase calls).

---

## 📄 License

This project is currently **unlicensed** (private). If you plan to open-source it, consider adding an **MIT License** — it's the most permissive and widely used for personal and commercial projects.

Create a `LICENSE` file at the root with the MIT template and update this section accordingly.

---

<div align="center">
  Made with ❤️ for Arabic-speaking patients and their families.
</div>
