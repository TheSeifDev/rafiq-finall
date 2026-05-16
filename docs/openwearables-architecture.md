# Open Wearables Architecture

## Overview

The RAFIQ app now integrates with **real** wearable providers via Open Wearables, replacing the previous fake BLE simulation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RAFIQ Mobile App                              │
├─────────────────────────────────────────────────────────────────────┤
│  UI Layer                                                            │
│  ├── WearablePairingScreen                                          │
│  ├── VitalsScreen                                                    │
│  └── WeeklyTrendsScreen                                              │
├─────────────────────────────────────────────────────────────────────┤
│  Service Layer                                                       │
│  ├── wearable.service.ts (main integration)                         │
│  ├── wearableAuth.service.ts (OAuth flows)                          │
│  ├── wearableSync.service.ts (offline queue)                        │
│  ├── wearableIngestion.service.ts (validation)                     │
│  └── healthData.mapper.ts (provider data transformation)            │
├─────────────────────────────────────────────────────────────────────┤
│  Repository Layer                                                   │
│  └── WearableRepository.ts (SQLite operations)                     │
├─────────────────────────────────────────────────────────────────────┤
│  Data Layer                                                          │
│  └── expo-sqlite (WAL mode)                                         │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     RAFIQ Backend (Edge Functions)                  │
├─────────────────────────────────────────────────────────────────────┤
│  /api/wearable/auth/* - Token exchange, refresh, revocation        │
│  /api/wearable/data/* - Provider data fetching                      │
│  /api/sync/wearable - Supabase sync endpoint                       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Open Wearables API                              │
├─────────────────────────────────────────────────────────────────────┤
│  Apple HealthKit    Health Connect    Samsung Health                │
│  Garmin             Fitbit            Oura                         │
│  Polar              Suunto            Strava                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Supported Providers

| Provider | Platform | Heart Rate | Blood Pressure | SpO2 | Temperature | Steps | Sleep | Activity |
|----------|----------|------------|----------------|------|-------------|-------|-------|----------|
| Apple Health | iOS | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Health Connect | Android 34+ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Samsung Health | Android | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Garmin | iOS/Android | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Fitbit | iOS/Android | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Oura | iOS/Android | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Polar | iOS/Android | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |
| Suunto | iOS/Android | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Strava | iOS/Android | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## Security

### Token Flow (NEVER client-side secrets)

1. Mobile app initiates OAuth → Opens browser
2. User authenticates with provider → Authorization code returned
3. Mobile app sends code to RAFIQ backend
4. RAFIQ backend exchanges code for tokens (using secrets)
5. RAFIQ backend returns access token to mobile app
6. Mobile app uses token to fetch health data

### NEVER DO

- Store `app_secret` in mobile app
- Store `provider_secret` in mobile app
- Call Open Wearables auth directly from mobile

## SQLite Schema

The following tables store wearable data locally:

- `wearable_connections` - Provider links and auth tokens
- `wearable_vitals` - Cached vitals readings
- `wearable_sleep_sessions` - Sleep data
- `wearable_activity_sessions` - Activity/workout data
- `wearable_sync_queue` - Offline sync queue

All tables include version, timestamps, and soft-delete columns for sync.

## Sync Strategy

1. Provider data fetched → Validated → Stored in SQLite
2. Record added to `wearable_sync_queue`
3. Background sync process dequeues and uploads to Supabase
4. Retry up to 3 times on failure
5. Mark as 'dead' after max retries

## Requirements

- **Expo SDK 54** with expo-sqlite
- **Dev Build** or **EAS Build** (not Expo Go)
- **Android API 34+** for Health Connect
- **iOS** for Apple Health