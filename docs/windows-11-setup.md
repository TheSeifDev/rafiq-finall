# Windows 11 Development Setup

## Prerequisites

### Software Requirements

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20.x LTS | Runtime |
| npm | 10.x | Package manager |
| Expo CLI | Latest | Development server |
| Android Studio | 2024.x | Android emulator |
| Visual Studio Code | Latest | Editor |

### Environment Variables

Create a `.env` file in `rafiq-app/`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=https://your-backend-url.com
EXPO_PUBLIC_OPENWEARABLES_API_URL=https://api.openwearables.com
```

## Installation Steps

### 1. Node.js Setup

```powershell
# Check Node.js version
node --version
# Should be 20.x.x

# Check npm version
npm --version
# Should be 10.x.x
```

### 2. Project Dependencies

```powershell
cd D:\Phantoms\Rafiq\rafiq-system\rafiq-app

# Install dependencies
npm install

# Install expo-sqlite (included in Expo SDK 54)
npm install expo-sqlite
```

### 3. Android Emulator Setup

```powershell
# Install Android Studio
# Download from: https://developer.android.com/studio

# During installation, enable:
# - Android SDK
# - Android Virtual Device

# Set environment variables
$env:ANDROID_HOME = "C:\Users\YOUR_USER\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\YOUR_USER\AppData\Local\Android\Sdk"
$env:PATH = "$env:PATH;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator"

# Create virtual device
# Open Android Studio → Device Manager → Create Virtual Device
# Select "Pixel 5" or similar → Download system image (API 34)
```

### 4. Running the App

```powershell
# Start Expo (web)
npx expo start

# Run on Android emulator
npx expo run:android

# Run on connected device
npx expo run:android --device
```

## Expo Go Limitation

⚠️ **Important**: Open Wearables integration requires **Dev Build** or **EAS Build**. It will NOT work in Expo Go because:

- Expo Go cannot access native Health APIs
- No background execution in Expo Go
- Limited to JavaScript-only features

### Building for Development

```powershell
# Generate Android project (one-time)
npx expo prebuild --platform android

# Build debug APK
cd android
./gradlew assembleDebug

# APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

## Common Issues

### Issue: `expo-sqlite not found`

**Solution**: Ensure you're using a development build, not Expo Go.

```powershell
npx expo prebuild --platform android
npx expo run:android
```

### Issue: Health Connect not available

**Solution**: Health Connect requires Android 14 (API 34). Use Android emulator with API 34+.

### Issue: Apple Health not working on Windows

**Solution**: Apple Health is iOS-only. Test on Mac or use cloud-based CI/CD with iOS simulators.

### Issue: `Module not found: Can't resolve 'uuid'`

**Solution**: Install uuid polyfill:

```powershell
npm install react-native-get-random-values uuid
```

## Recommended Workflow

1. **Development**: Use web or Android emulator
2. **Testing Wearables**: Test on physical Android device (API 34+) or iOS device
3. **Production**: Use EAS Build for full native capabilities

## Supabase Local Development

```powershell
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Environment variables for local
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
```

## File Structure

```
rafiq-app/
├── src/
│   ├── services/wearable/
│   │   ├── wearable.service.ts      # Main integration
│   │   ├── wearableAuth.service.ts  # OAuth handling
│   │   ├── wearableSync.service.ts  # Queue processing
│   │   ├── wearableIngestion.service.ts  # Validation
│   │   └── healthData.mapper.ts     # Provider transforms
│   ├── repositories/
│   │   └── WearableRepository.ts    # SQLite operations
│   └── types/
│       └── wearable.ts              # Type definitions
├── docs/
│   ├── openwearables-architecture.md
│   ├── wearable-sync-flow.md
│   └── windows-11-setup.md
└── package.json
```