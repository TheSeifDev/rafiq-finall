# Provider Support Matrix

## Platform Compatibility

| Provider | iOS | Android | Web | Notes |
|----------|-----|---------|-----|-------|
| Apple Health | ✅ 14+ | ❌ | ❌ | Requires iOS 14+ |
| Health Connect | ❌ | ✅ 34+ | ❌ | Android 14 (API 34) required |
| Samsung Health | ✅ | ✅ | ❌ | Requires Samsung device |
| Garmin | ✅ | ✅ | ✅ | Works on all platforms |
| Fitbit | ✅ | ✅ | ✅ | Works on all platforms |
| Oura | ✅ | ✅ | ✅ | Works on all platforms |
| Polar | ✅ | ✅ | ❌ | Requires Polar device |
| Suunto | ✅ | ✅ | ❌ | Requires Suunto device |
| Strava | ✅ | ✅ | ✅ | Works on all platforms |

## Data Availability

### Apple Health

- **Heart Rate**: ✅ Resting and active
- **Blood Pressure**: ❌ Not available via HealthKit
- **SpO2**: ✅ Pulse oximetry
- **Temperature**: ✅ Body temperature
- **Steps**: ✅ Daily step count
- **Sleep**: ✅ Sleep analysis
- **Activity**: ✅ Active energy, exercise minutes

### Health Connect (Android)

- **Heart Rate**: ✅ Instantaneous and resting
- **Blood Pressure**: ✅ Systolic and diastolic
- **SpO2**: ✅ Pulse oximetry
- **Temperature**: ✅ Body temperature
- **Steps**: ✅ Step count
- **Sleep**: ✅ Sleep sessions
- **Activity**: ✅ Exercise sessions, calories

### Samsung Health

- **Heart Rate**: ✅ Heart rate
- **Blood Pressure**: ✅ Blood pressure (if supported by device)
- **SpO2**: ✅ Blood oxygen (if supported by device)
- **Temperature**: ❌ Not available
- **Steps**: ✅ Step count
- **Sleep**: ✅ Sleep tracker
- **Activity**: ✅ Workout tracking

### Garmin

- **Heart Rate**: ✅ Heart rate variability
- **Blood Pressure**: ❌ Not available
- **SpO2**: ✅ Pulse oximetry (device-dependent)
- **Temperature**: ❌ Not available
- **Steps**: ✅ Step count
- **Sleep**: ✅ Sleep tracking
- **Activity**: ✅ Activities and workouts

### Fitbit

- **Heart Rate**: ✅ Heart rate zones
- **Blood Pressure**: ❌ Not available (except for FDA-cleared devices)
- **SpO2**: ✅ Sleep-based SpO2
- **Temperature**: ❌ Not available
- **Steps**: ✅ Step count
- **Sleep**: ✅ Sleep stages
- **Activity**: ✅ Active zone minutes

### Oura

- **Heart Rate**: ✅ Resting heart rate
- **Blood Pressure**: ❌ Not available
- **SpO2**: ❌ Not available
- **Temperature**: ✅ Skin temperature
- **Steps**: ❌ Not available
- **Sleep**: ✅ Sleep stages and score
- **Activity**: ✅ Activity score and readiness

### Polar

- **Heart Rate**: ✅ Continuous heart rate
- **Blood Pressure**: ❌ Not available
- **SpO2**: ✅ Blood oxygen (device-dependent)
- **Temperature**: ❌ Not available
- **Steps**: ✅ Step count
- **Sleep**: ❌ Not available via API
- **Activity**: ✅ Training sessions

### Suunto

- **Heart Rate**: ✅ Heart rate
- **Blood Pressure**: ❌ Not available
- **SpO2**: ❌ Not available
- **Steps**: ✅ Step count
- **Sleep**: ✅ Sleep tracking
- **Activity**: ✅ Activities and routes

## OAuth Requirements

All providers require server-side token exchange. The mobile app NEVER stores secrets.

| Provider | Auth Type | Required Backend |
|----------|-----------|------------------|
| Apple Health | OAuth 2.0 | ✅ Edge Function |
| Health Connect | Internal | ❌ Direct (Android only) |
| Samsung Health | OAuth 2.0 | ✅ Edge Function |
| Garmin | OAuth 1.0a | ✅ Edge Function |
| Fitbit | OAuth 2.0 | ✅ Edge Function |
| Oura | OAuth 2.0 | ✅ Edge Function |
| Polar | OAuth 2.0 | ✅ Edge Function |
| Suunto | OAuth 2.0 | ✅ Edge Function |
| Strava | OAuth 2.0 | ✅ Edge Function |

## Rate Limits

| Provider | Rate Limit | Notes |
|----------|------------|-------|
| Apple Health | None | On-device, no API limits |
| Health Connect | None | On-device, no API limits |
| Garmin | 500 req/hour | Per user |
| Fitbit | 150 req/hour | Per user |
| Oura | 100 req/hour | Per user |
| Polar | 1000 req/hour | Per user |
| Suunto | Varies | Depends on plan |
| Strava | 1000 req/hour | Per user, 10000/day |

## Error Handling

| Error Code | Meaning | Action |
|------------|---------|--------|
| 401 | Token expired | Refresh token automatically |
| 403 | Access denied | Re-authenticate user |
| 429 | Rate limited | Exponential backoff |
| 500 | Server error | Retry with backoff |
| 503 | Service unavailable | Queue for later |

## Device Requirements

### Apple Health

- iPhone with iOS 14+
- Apple Watch (for continuous HR)

### Health Connect

- Android 14+ (API 34)
- Device must support Health Connect
- Samsung Galaxy, Pixel, OnePlus supported

### Garmin

- Any Garmin device with Connect IQ
- Fenix, Forerunner, Venu, etc.

### Fitbit

- Any Fitbit device
- Charge, Inspire, Ionic, Versa, Sense

### Oura

- Oura Ring (Gen 2 or Gen 3)

### Polar

- Polar Vantage, Grit, or Verity

### Suunto

- Suunto 9, 5, or 3 series

## Testing

For development without physical devices:

1. **Use Garmin/Fitbit/Strava**: These work on web and emulator
2. **Mock data**: Backend can return test data for development
3. **Health Connect**: Use Android emulator with API 34

## Implementation Notes

- All timestamps in ISO 8601 format
- All vitals validated before storage
- Duplicate detection via recorded_at + provider + user_id
- Offline-first: all data stored in SQLite first
- Sync queue handles retry and idempotency