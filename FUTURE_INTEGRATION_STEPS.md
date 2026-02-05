# Future Integration: Default Dialer & Call Recording

This document outlines the technical steps required to upgrade the application to function as the **Default Dialer** and implement **Call Recording**.

> **⚠️ Technical Warning**: These features require deep integration with the Android system. Modern Android versions (10+) have strict security policies regarding call recording. Being the "Default Dialer" is often a prerequisite for accessing call audio streams, but even then, hardware-level limitations may apply on certain devices.

---

## Part 1: Making the App the Default Dialer

To replace the system phone app, your app must implement the `InCallService` API and declare specific capabilities in the Android Manifest.

### 1. Android Manifest Changes

You need to declare that your app handles phone calls and provide an implementation of the logic that replaces the default call screen.

**Required Permissions:**

```xml
<uses-permission android:name="android.permission.MANAGE_OWN_CALLS"/>
<uses-permission android:name="android.permission.READ_CALL_LOG"/>
<uses-permission android:name="android.permission.WRITE_CALL_LOG"/>
<uses-permission android:name="android.permission.READ_PHONE_STATE"/>
<uses-permission android:name="android.permission.CALL_PHONE"/>
```

**Service Declaration (InCallService):**
You must register a service that extends `android.telecom.InCallService`. This service controls the ongoing call logic (mute, hangup, dtmf).

```xml
<service android:name=".services.MyInCallService"
         android:permission="android.permission.BIND_INCALL_SERVICE"
         android:exported="true">
    <meta-data android:name="android.telecom.IN_CALL_SERVICE_UI" android:value="true" />
    <intent-filter>
        <action android:name="android.telecom.InCallService" />
    </intent-filter>
</service>
```

**Activity Activity:**
Your main activity needs generic intent filters to handle dial requests.

```xml
<intent-filter>
    <action android:name="android.intent.action.DIAL" />
    <category android:name="android.intent.category.DEFAULT" />
</intent-filter>
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <action android:name="android.intent.action.DIAL" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="tel" />
</intent-filter>
```

### 2. Requesting the Role (Runtime)

You cannot just "set" yourself as default; the user must grant it. On Android 10+ (API 29+), use the `RoleManager`.

**Kotlin Implementation (Module Helper):**

```kotlin
@RequiresApi(Build.VERSION_CODES.Q)
fun requestDefaultDialerRole(activity: Activity) {
    val roleManager = activity.getSystemService(RoleManager::class.java)
    if (roleManager.isRoleAvailable(RoleManager.ROLE_DIALER) &&
        !roleManager.isRoleHeld(RoleManager.ROLE_DIALER)) {
        val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER)
        activity.startActivityForResult(intent, REQUEST_CODE_SET_DEFAULT_DIALER)
    }
}
```

---

## Part 2: Call Recording

Recording audio from a phone call is one of the most protected features in Android.

### 1. The Challenge (Android 10+)

Google blocked access to `MediaRecorder.AudioSource.VOICE_CALL` for third-party apps to comply with privacy laws.

- **Standard Apps**: Cannot record calls purely via software.
- **Default Dialers**: Have elevated privileges but are practically restricted by many OEMs (Samsung, Xiaomi, etc.) at the hardware abstraction layer (HAL).

### 2. Implementation Strategy (If Default Dialer)

As the Default Dialer, you _may_ be able to access the audio streams depending on the device.

**Manifest Permission:**

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
```

**Recording Logic (Java/Kotlin):**
You would use `MediaRecorder` or `AudioRecord`.

```kotlin
val recorder = MediaRecorder().apply {
    setAudioSource(MediaRecorder.AudioSource.VOICE_COMMUNICATION) // or VOICE_CALL
    setOutputFormat(MediaRecorder.OutputFormat.AMR_NB)
    setAudioEncoder(MediaRecorder.AudioEncoder.AMR_NB)
    setOutputFile(filePath)
    prepare()
    start()
}
```

### 3. Native Module Requirement

Since React Native does not natively support `InCallService` or low-level audio stream management during calls, you **MUST** write native modules for this.

- **`CallServiceModule`**: To bridge events from the `InCallService` (Java/Kotlin) to your JS UI (e.g., "Outgoing Call Started", "Call Connected").
- **`CallRecordingModule`**: To manage the `MediaRecorder` lifecycle.

---

## Recommended Integration Path

1.  **Create a New Expo Config Plugin**:
    - Since these changes require heavy `AndroidManifest.xml` modifications and creating new Java files (`MyInCallService.java`), do not edit `android/` manually.
    - Create `plugins/withDefaultDialer.js`.

2.  **Steps to implement**:
    - **Phase 1**: Implement the UI for a Dialer (Keypad, Call Screen, Incoming Call Notification).
    - **Phase 2**: Create the native `InCallService` and `RoleManager` logic.
    - **Phase 3**: Verify simple "Default Dialer" status (can you make/receive calls?).
    - **Phase 4**: Attempt Call Recording implementation on target test devices.

3.  **Testing**:
    - You **cannot** test this on simulators fully (they cannot make real cellular calls).
    - You need physical Android devices running different OS versions (11, 12, 13, 14).
