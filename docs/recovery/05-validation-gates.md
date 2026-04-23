# Validation Gates and Regression Matrix

## Gate per change set
- Type check passes (`npm run typecheck`).
- No duplicate `NavigationContainer` mounts.
- No broken legacy compatibility imports.

## Core regression journeys
1. Cold start while signed out -> Welcome -> Login -> Home.
2. Sign out from authenticated route -> auth stack.
3. Deep link `rafiq://emergency` from signed-in and signed-out states.
4. Background app mid-request and resume.
5. Notifications mark-read and realtime insert handling.
6. Vitals and medications read/write with empty-state and error-state handling.

## Mobile edge checks
- Android hardware back behavior in tabs and profile stack.
- iOS back swipe in profile subroutes.
- Offline transition during Supabase requests.
- Rapid repeated taps on primary actions.
