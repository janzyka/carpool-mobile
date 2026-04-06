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

---

### Push notification setup checklist (per environment)

Follow these steps in order for each environment (dev, prod). Steps 1–2 are one-time per Firebase project. Steps 3–5 must be repeated per environment.

#### 1. Firebase — register Android app

Already done for dev. For a new environment (e.g. prod with a different package name):

- Go to [Firebase Console](https://console.firebase.google.com/project/carpool-8efc7) → Project Settings → **Your apps** → Add app → Android
- Package name: `com.zykyc.carpool` (same for dev and prod unless you use separate package names)
- Download `google-services.json` and place it in the project root
- Rebuild the native client (`eas build`)

#### 2. Upload FCM V1 credentials to Expo

Expo's push relay needs a Firebase service account key to deliver to Android devices via FCM V1:

1. [Firebase Console](https://console.firebase.google.com/project/carpool-8efc7) → Project Settings → **Service accounts** tab
2. Click **Generate new private key** → download the JSON file
3. Upload to Expo:
```bash
eas credentials --platform android
```
Select: your app → **FCM V1 service account key** → upload the downloaded JSON

> Without this step Expo returns `{"status":"error","details":{"error":"InvalidCredentials"}}` and no notification is delivered.

#### 3. AWS — deploy the backend stack

The backend requires a `send-push-notification` Lambda (no VPC — has direct internet access) and a Lambda VPC Interface Endpoint so VPC-bound Lambdas can invoke it without a NAT Gateway:

```bash
# From the carpool backend repo root:
aws cloudformation deploy \
  --stack-name carpool-<env> \
  --template-file src/main/resources/aws/cloudformation.yaml \
  --parameter-overrides \
      Environment=<env> \
      LambdaS3Bucket=<bucket> \
      LambdaS3Key=carpool-1.0-SNAPSHOT.jar \
  --capabilities CAPABILITY_NAMED_IAM
```

Key CloudFormation resources for push:
- `SendPushNotificationLambda` — no VPC, calls Expo API directly
- `LambdaVpcEndpoint` — VPC Interface Endpoint (`com.amazonaws.<region>.lambda`) — allows VPC Lambdas to invoke `send-push-notification` over the AWS private network (~$7/month, no NAT Gateway needed)
- `LambdaEndpointSecurityGroup` — allows HTTPS (443) from `LambdaSecurityGroup` to the endpoint
- `PUSH_LAMBDA_NAME` env var — set on `submit-ride`, `respond-to-ride-interest`, `create-ride-interest`

#### 4. Verify end-to-end delivery

After deploying, send a direct test push via curl to confirm FCM credentials and token are working:

```bash
curl -s -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "to": "<ExponentPushToken of test user>",
    "title": "Test",
    "body": "Push test",
    "data": {"type": "interest_response"}
  }'
```

Expected response: `{"data":{"status":"ok","id":"..."}}`.
If you see `InvalidCredentials` repeat step 2. If you see `DeviceNotRegistered` the user needs to relaunch the app to re-register their token.

#### 5. Verify Lambda pipeline

Check CloudWatch logs after triggering a push-generating action (e.g. accept/decline an interest):

```bash
# Caller Lambda — should show: [push] async invoke dispatched to carpool-<env>-send-push-notification
aws logs filter-log-events \
  --log-group-name /aws/lambda/carpool-<env>-respond-to-ride-interest \
  --start-time $(python3 -c "import time; print(int((time.time()-300)*1000))") \
  --query "events[*].message" --output text

# Push Lambda — should show: [push] HTTP 200 → {"data":{"status":"ok",...}}
aws logs filter-log-events \
  --log-group-name /aws/lambda/carpool-<env>-send-push-notification \
  --start-time $(python3 -c "import time; print(int((time.time()-300)*1000))") \
  --query "events[*].message" --output text
```

---

---

## Push notification events

All push notifications are sent via the Expo Push API through the `send-push-notification` Lambda (non-VPC). VPC-bound Lambdas dispatch to it asynchronously via the Lambda VPC Interface Endpoint.

| Event | Trigger | Recipient(s) | Title | `data.type` | App reaction |
|---|---|---|---|---|---|
| New ride posted | `POST /rides` | All verified users except the poster | "New ride available" | `new_ride` | Refresh rides + interests |
| New ride interest | `POST /ride-interests` | Ride owner | "New ride request" | `new_interest` | Refresh requests (Rides tab) |
| Interest accepted | `POST /ride-interests/{id}/response` (accepted=true) | Interest requester | "Request accepted 🎉" | `interest_response` | Refresh interests (Requests tab) |
| Interest declined | `POST /ride-interests/{id}/response` (accepted=false) | Interest requester | "Request declined" | `interest_response` | Refresh interests (Requests tab) |
| Ride cancelled by driver | `DELETE /rides/{id}` | All users with pending or accepted interest on that ride | "Ride cancelled 🚫" | `interest_response` | Refresh interests (Requests tab) |

**Notes:**
- Push is best-effort — it never fails the main API request
- Recipients must have a non-null `push_token` in `app_user` — set on app launch after permission is granted
- `interest_response` with `status=3` means cancelled by ride deletion (as opposed to `status=2` which is an explicit driver decline)
- The app also refreshes all data on `AppState` foreground transition (user switches back to app without tapping a notification)

---

### How notifications trigger data refresh

| Event | Notification type | App action |
|---|---|---|
| New ride posted | `new_ride` | Refresh rides + interests |
| Someone requests your ride | `new_interest` | Refresh requests |
| Your request was accepted/declined | `interest_response` | Refresh interests |

The app also refreshes all data automatically when it returns to the foreground (`AppState` listener).
