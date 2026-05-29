# Fitty Mobile

Expo mobile app for Fitty. The MVP follows the approved mobile-first direction:

- onboarding before account creation
- Today / Progress / + Log / Plans / Coach bottom navigation
- Today uses the Habit / Progress concept
- quick logging is opened from the raised center button
- AI and health surfaces include a wellness, not medical advice boundary

```bash
npm install
npm run start
```

Use `EXPO_PUBLIC_API_BASE_URL` to point an emulator or physical device at the API Gateway. Android emulators commonly need `http://10.0.2.2:8080` instead of `http://localhost:8080`.

Mock-first mode is enabled by default so the app runs before every backend endpoint exists:

```bash
EXPO_PUBLIC_USE_MOCKS=true
```

Set it to `false` when the matching gateway endpoints are ready:

```bash
EXPO_PUBLIC_USE_MOCKS=false
EXPO_PUBLIC_API_BASE_URL=http://fitty-cp-01:30080
```
