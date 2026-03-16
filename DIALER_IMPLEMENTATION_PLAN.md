# Dialer Application Implementation Plan

## Overview

This document outlines the detailed plan to implement a full-featured custom Dialer application in React Native (Expo).
**Crucial Constraint:** The `android/` directory must **never** be manually modified. All native Android setup (permissions, intents, services, native modules) will be achieved exclusively through custom **Expo Config Plugins** (`plugins/`).

---

## Phase 1: Foundation & Manifest Setup

To become the default dialer, the Android System requires specific configurations. We will build an Expo config plugin (`plugins/withDialerSetup.js`) to handle these modifications automatically during prebuild.

### Tasks

- [x] **Create \`withDialerSetup.js\` Expo Plugin:**
  - Inject required permissions: \`READ_PHONE_STATE\`, \`CALL_PHONE\`, \`READ_CALL_LOG\`, \`WRITE_CALL_LOG\`, \`MANAGE_OWN_CALLS\`, \`BIND_INCALL_SERVICE\`.
  - Inject \`ACTION_DIAL\` and \`ACTION_CALL\` intent filters into the main activity.
- [x] **Define \`InCallService\` in Manifest:**
  - Inject the \`<service>\` tag for our custom \`InCallService\` implementation.
  - Set \`android:permission="android.permission.BIND_INCALL_SERVICE"\`.
  - Add \`<meta-data android:name="android.telecom.IN_CALL_SERVICE_UI" android:value="true" />\`.
  - Add intent filter for \`android.telecom.InCallService\`.
  - Mark foreground service type as \`phoneCall\` (required for Android 14+).
- [x] **Create native Kotlin classes via \`withDangerousMod\`:**
  - Generate \`TeleCRMInCallService.kt\` which extends \`android.telecom.InCallService\`.
  - Generate a React native wrapper module \`DialerModule.kt\` to bridge calls (Answer, Reject, Play DTMF) to React Native.
- [x] **Integrate Plugin:** Add \`./plugins/withDialerSetup\` to \`app.json\`.

---

## Phase 2: Core Calling Logic

This phase focuses on bridging the native Telecom lifecycle events to React Native.

### Tasks

- [x] **Call State Listener (Native to JS):**
  - Implement \`onCallAdded\`, \`onCallRemoved\`, \`onStateChanged\` in \`TeleCRMInCallService.kt\`.
  - Send lifecycle events (\`DIALING\`, \`RINGING\`, \`ACTIVE\`, \`DISCONNECTED\`) to React Native via \`DeviceEventManagerModule.RCTDeviceEventEmitter\`.
- [x] **Outgoing Call Handler:**
  - Export a \`placeCall(phoneNumber)\` method in \`DialerModule.kt\` using \`TelecomManager.placeCall\`.
- [x] **Incoming Call Handler:**
  - On \`RINGING\`, the JS layer will trigger a High Priority "Heads-up" notification using Expo Notifications (or via a native Full-Screen Intent injected by our plugin).
- [ ] **Audio Route Management:**
  - Export methods to change audio routes: \`setAudioRoute(route)\` (Earpiece, Speaker, Bluetooth).
- [ ] **Proximity Sensor Integration:**
  - Use wake locks (\`PROXIMITY_SCREEN_OFF_WAKE_LOCK\`) natively within the call session to manage screen states during active calls.

---

## Phase 3: The User Interface (UI)

Build the React Native interfaces to interact with the underlying core logic.

### Tasks

- [x] **Dial Pad (\`src/screens/DialerScreen.js\`):**
  - Build a responsive T9-enabled dialer for searching contacts by number or name.
- [x] **In-Call Screen (\`src/screens/InCallScreen.js\`):**
  - Design the active call UI (Contact details, duration timer).
- [x] **Call Controls:**
  - Implement buttons for Mute, Keypad (DTMF tones), Speaker, and Add Call.
  - Link DTMF UI button to native \`Call.playDtmfTone(char)\`.
- [x] **End Call Logic:**
  - Listen for \`DISCONNECTED\` event in React Native to close the \`InCallScreen\` cleanly.
- [ ] **Call Log/History (\`src/screens/CallLogScreen.js\`):**
  - Integrate with the existing call log API or \`react-native-call-log\` to show missed/outgoing/incoming with timestamps.

---

## Phase 4: Advanced Features (The "Pro" List)

Enhance the basic dialer with professional-grade features.

### Tasks

- [ ] **Conference/Merging:**
  - Implement \`mergeConference()\` logic bridging native Telecom API.
- [ ] **Video Call UI (Deferred):**
  - Research Android 14+ requirements for \`VideoCall\` integration (SurfaceView).
- [ ] **Call Recording (Check Compliance):**
  - Build audio recording logic natively, adhering strictly to Android accessibility blocking rules and play audio disclaimer natively.
- [ ] **Spam Detection:**
  - Hook Firebase or 3rd-party API using the incoming CLI number in the \`onCallAdded\` listener before presenting the UI.
- [ ] **Emergency Bypass:**
  - Validate that numbers matching emergency patterns (e.g., 911, 112) automatically fallback to the system default dialer without interception.

---

## Phase 5: Testing & Compliance

### Tasks

- [x] **Default Role Request:**
  - Implement native method \`requestDefaultDialerRole()\` using \`RoleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER)\` and export to JS.
  - Design the popup UI explaining _why_ the role is needed.
- [ ] **Data Privacy Policy:**
  - Add explicit disclosure screen before asking for permissions/role.
- [ ] **Handling Interruptions:**
  - Simulate VoIP (WhatsApp) vs Cellular calls concurrently and test focus changes.
- [ ] **Accessibility:**
  - Validate Dial Pad and In-Call UI with TalkBack and proper UI hints.
- [ ] **Compliance:**
  - Ensure the recording features avoid restricted Accessibility API hacks to pass Google Play Store review.

---

## Summary of Action Plan

1. Start with **Phase 1**: Write \`plugins/withDialerSetup.js\` to inject all required manifest nodes and generate the native \`TeleCRMInCallService.kt\` and \`DialerModule.kt\`.
2. Move to **Phase 2** & **Phase 5**: Ensure the app can successfully request the "Default Dialer" role from the Android framework.
3. Move to **Phase 3**: Connect the React Native screens (\`InCallScreen\`, \`DialerScreen\`) to the native events via React Context/Redux.
4. Finalize with **Phase 4** polishing.
