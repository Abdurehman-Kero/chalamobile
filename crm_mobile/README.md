# ChalaMob CRM: Android app

React Native 0.87 + TypeScript. Talks to [`../crm_backend`](../crm_backend).

## Run it

```sh
npm install
npm start            # terminal 1: Metro
npm run android      # terminal 2: build and launch on a device or emulator
```

Needs Node 22.11+, the Android SDK and a JDK (see the
[React Native environment guide](https://reactnative.dev/docs/set-up-your-environment)).
The app has no `.env`; the server address is a single constant in `src/api/axios.ts` (below).

## Connect the app to the backend

The app talks to the live server by default (`PRODUCTION_URL` in `src/api/axios.ts`,
currently `https://chalamob-backend.onrender.com`). Staff install it and sign in; there is
nothing to configure.

- **Release builds use HTTPS only.** Plain `http` is blocked by the Android network
  security config, and an old developer address saved on a phone is ignored.
- **Free hosts sleep.** The first request after a quiet period can take up to a minute while
  the server wakes up. The app waits for it, says so on the login screen, and starts waking
  it as soon as it opens.
- **Pointing at another server:** change `PRODUCTION_URL` and rebuild, or, in a debug build,
  open **Server connection** (login screen "Change", or avatar → Server connection).

Developing against a backend on your own computer (debug builds only, which allow `http`):

| Where the app runs | Server address (Server connection → preset) |
|---|---|
| Android emulator | `10.0.2.2:3001` |
| Phone on a USB cable | `127.0.0.1:3001`, plus `adb reverse tcp:3001 tcp:3001` (a debug install does this for you) |
| Phone on the same Wi-Fi | `<the computer's IP>:3001` |

## Build an APK to share

```sh
cd android
./gradlew assembleRelease          # Windows: gradlew.bat assembleRelease
```

The file is `android/app/build/outputs/apk/release/app-release.apk`. It contains the app
code, so it runs without Metro or a computer. To install it, the phone must allow
"install unknown apps" for whatever opens the file.

It is built for 64-bit ARM phones (practically every phone made in the last several years).
To add older 32-bit phones, set `reactNativeArchitectures=armeabi-v7a,arm64-v8a` in
`android/gradle.properties` (the APK gets larger).

**Signing.** Without extra setup, release builds are signed with the debug key, which is fine
for testing and for sharing with colleagues. For the Play Store, make your own key and create
`android/keystore.properties` (git-ignored):

```properties
storeFile=../chalamob-release.keystore
storePassword=...
keyAlias=...
keyPassword=...
```

The release build uses it automatically when the file exists. Keep the keystore and its
passwords safe: without them you can never publish an update.
Bump `versionCode` in `android/app/build.gradle` for every release you hand out.

## App icon

Generated artwork lives in `assets/` (`app-icon-512.png` and a preview). The Android icon
files are in `android/app/src/main/res/mipmap-*` (adaptive + round + Android 13 themed).

## Project layout

```
src/
  api/          typed calls to the server, error messages, reachability
  offline/      the outbox: saves changes, sends them in order, overlays pending changes
  screens/      Login, Home, Stock, Repairs, Sell, Clients, Daily report, Team
  components/   shared UI: buttons, modals, forms, skeleton loaders, banners
  store/        auth, cart, connection and toast state (zustand)
  hooks/        useResource (cached, refreshes itself), useRole, useAlerts
  theme/        every colour and spacing value (no hardcoded colours in screens)
  navigation/   tabs by role, stack for report and team pages
```

## How offline works (short version)

`src/offline/` holds the whole feature. Screens call functions from
`offline/mutations.ts`; each change is saved in AsyncStorage first, sent to the server when
it answers, and shown immediately in the meantime (`offline/overlays.ts`). The engine
(`offline/engine.ts`) sends the queue on its own whenever the phone is online and
retries after failures. Adding offline support for a new kind of change means one entry
in `offline/operations.ts`.

## Tests and checks

```sh
npm test               # offline engine, formatting and date logic
npx tsc --noEmit       # type check
npm run lint
```
