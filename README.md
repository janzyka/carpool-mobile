# carpool-mobile

React Native (Expo) mobile app for the Carpool platform.

## Tech stack

- **Expo SDK 54** with Expo Router (file-based navigation)
- **React Native** — iOS and Android
- **Zustand** — global state management
- **Axios** — API client
- **expo-image-picker + expo-image-manipulator** — photo selection and compression (400×400 px, JPEG 70%)
- **expo-notifications** — push notifications via Expo Push API (backed by FCM on Android, APNs on iOS)

---

## Getting started

### Prerequisites

- Node.js 18+
- `npm install`
- Expo Go app on your device (for quick JS-only development)

### Environment

Copy `.env.example` to `.env` and fill in the API URL:

```bash
cp .env.example .env
```

The app reads `API_URL` at startup via `app.config.js`. The dev API URL is pre-filled as the default fallback so Expo Go works without a `.env` file.

### Run in Expo Go

```bash
npx expo start
```

> **Note:** `expo-image-manipulator` is not bundled in Expo Go — photo upload features will not work. Use the dev build for full functionality.

---

## Build profiles (EAS)

Defined in `eas.json`:

| Profile | Target | API |
|---|---|---|
| `development` | Dev client (internal) | dev stack |
| `preview` | Standalone APK/IPA (internal) | dev stack |
| `production` | Store build | prod stack |

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Build dev client for Android
eas build --profile development --platform android

# Build dev client for iOS
eas build --profile development --platform ios
```

After installing the dev build, run Metro with:

```bash
npx expo start --dev-client
```

---

## Push notifications

Push notifications use the **Expo Push API** (`exp.host`) as a relay, backed by platform-specific services:

- **Android** — Firebase Cloud Messaging (FCM) — mandatory on all Android devices
- **iOS** — Apple Push Notification service (APNs) — handled automatically by EAS credentials

### Android — Firebase setup

Android push notifications **require** a `google-services.json` file baked into the native build. This file is committed to the repository at [`./google-services.json`](./google-services.json).

**Firebase project details:**

| Field | Value |
|---|---|
| Firebase project ID | `carpool-8efc7` |
| Firebase project number | `96175103465` |
| Android package name | `com.zykyc.carpool` |
| Firebase console | [console.firebase.google.com/project/carpool-8efc7](https://console.firebase.google.com/project/carpool-8efc7) |

If `google-services.json` is ever regenerated (e.g. after rotating keys), download the new file from the Firebase console and replace the existing one, then rebuild the dev/production client.

### iOS — APNs setup

EAS manages APNs keys automatically during the first iOS build. No additional files need to be committed.

### How notifications trigger data refresh

| Event | Notification type | App action |
|---|---|---|
| New ride posted | `new_ride` | Refresh rides + interests |
| Someone requests your ride | `new_interest` | Refresh requests |
| Your request was accepted/declined | `interest_response` | Refresh interests |

The app also refreshes all data automatically when it returns to the foreground (`AppState` listener).
