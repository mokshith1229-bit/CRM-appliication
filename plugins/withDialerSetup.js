const { withAndroidManifest, withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.vivtej.telecrm';
const PACKAGE_PATH = PACKAGE_NAME.replace(/\./g, '/');

const TELECRM_SERVICE_KT = `package ${PACKAGE_NAME}

import android.content.Intent
import android.telecom.Call
import android.telecom.InCallService
import android.util.Log

class TeleCRMInCallService : InCallService() {
    companion object {
        const val TAG = "TeleCRMInCallService"
        var currentCall: Call? = null
            private set
            
        var actionListener: ((String, String?) -> Unit)? = null
        
        fun answer() { currentCall?.answer(0) }
        fun reject() { currentCall?.reject(false, null) }
        fun disconnect() { currentCall?.disconnect() }
        fun playDtmf(c: Char) { currentCall?.playDtmfTone(c) }
    }

    private val callCallback = object : Call.Callback() {
        override fun onStateChanged(call: Call, state: Int) {
            super.onStateChanged(call, state)
            val stateStr = when (state) {
                Call.STATE_NEW -> "NEW"
                Call.STATE_RINGING -> "RINGING"
                Call.STATE_DIALING -> "DIALING"
                Call.STATE_ACTIVE -> "ACTIVE"
                Call.STATE_HOLDING -> "HOLDING"
                Call.STATE_DISCONNECTED -> "DISCONNECTED"
                else -> "UNKNOWN"
            }
            Log.d(TAG, "Call State: $stateStr")
            actionListener?.invoke(stateStr, call.details?.handle?.schemeSpecificPart)
        }
    }

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        Log.d(TAG, "onCallAdded")
        currentCall = call
        call.registerCallback(callCallback)
        
        val stateStr = if (call.state == Call.STATE_RINGING) "RINGING" else "DIALING"
        actionListener?.invoke(stateStr, call.details?.handle?.schemeSpecificPart)
        
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        startActivity(intent)
    }

    override fun onCallRemoved(call: Call) {
        super.onCallRemoved(call)
        Log.d(TAG, "onCallRemoved")
        call.unregisterCallback(callCallback)
        if (currentCall == call) { currentCall = null }
        actionListener?.invoke("DISCONNECTED", null)
    }
}
`;

const DIALER_MODULE_KT = `package ${PACKAGE_NAME}

import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.telecom.TelecomManager
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class DialerModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    init {
        TeleCRMInCallService.actionListener = { state, number ->
            val params = Arguments.createMap()
            params.putString("state", state)
            params.putString("number", number)
            reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("CallStateUpdated", params)
        }
    }

    override fun getName(): String { return "DialerModule" }

    @ReactMethod
    fun placeCall(phoneNumber: String, promise: Promise) {
        try {
            val telecomManager = reactContext.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            val uri = Uri.fromParts("tel", phoneNumber, null)
            val extras = android.os.Bundle()
            telecomManager.placeCall(uri, extras)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CALL_FAILED", e.message)
        }
    }

    @ReactMethod
    fun answerCall(promise: Promise) {
        try {
            TeleCRMInCallService.answer()
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("ERROR", e.message) }
    }

    @ReactMethod
    fun rejectCall(promise: Promise) {
        try {
            TeleCRMInCallService.reject()
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("ERROR", e.message) }
    }

    @ReactMethod
    fun disconnectCall(promise: Promise) {
        try {
            TeleCRMInCallService.disconnect()
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("ERROR", e.message) }
    }

    @ReactMethod
    fun playDtmfTone(dtmfChar: String, promise: Promise) {
        if (dtmfChar.isNotEmpty()) {
            TeleCRMInCallService.playDtmf(dtmfChar[0])
            promise.resolve(true)
        } else { promise.reject("ERROR", "Invalid") }
    }

    @ReactMethod
    fun requestDefaultDialerRole(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val roleManager = reactContext.getSystemService(Context.ROLE_SERVICE) as RoleManager
                val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                reactContext.startActivity(intent)
            } else {
                val intent = Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER)
                intent.putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, reactContext.packageName)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                reactContext.startActivity(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ROLE_REQUEST_FAILED", "Failed to request role: \${e.message}")
        }
    }

    @ReactMethod
    fun isDefaultDialer(promise: Promise) {
        try {
            val telecomManager = reactContext.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            val isDefault = reactContext.packageName == telecomManager.defaultDialerPackage
            promise.resolve(isDefault)
        } catch (e: Exception) {
            promise.reject("CHECK_FAILED", "Failed to check default dialer status: \${e.message}")
        }
    }
}
`;

const DIALER_PACKAGE_KT = `package ${PACKAGE_NAME}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class DialerPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(DialerModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;

const withDialerManifest = (config) => {
    return withAndroidManifest(config, async config => {
        const androidManifest = config.modResults.manifest;
        
        // Add permissions
        const permissions = [
            'android.permission.CALL_PHONE',
            'android.permission.READ_CALL_LOG',
            'android.permission.WRITE_CALL_LOG',
            'android.permission.BIND_INCALL_SERVICE',
            'android.permission.MANAGE_OWN_CALLS',
            'android.permission.READ_PHONE_STATE',
            // Audio & overlay — required for in-call audio control and heads-up display
            'android.permission.MODIFY_AUDIO_SETTINGS',
            'android.permission.RECORD_AUDIO',
            'android.permission.SYSTEM_ALERT_WINDOW',
        ];

        if (!androidManifest['uses-permission']) {
            androidManifest['uses-permission'] = [];
        }

        const existingPermissions = androidManifest['uses-permission'].map(
            perm => perm.$['android:name']
        );

        permissions.forEach(permission => {
            if (!existingPermissions.includes(permission)) {
                androidManifest['uses-permission'].push({
                    $: { 'android:name': permission },
                });
            }
        });

        // Add Service to application
        const app = androidManifest.application[0];
        if (!app.service) {
            app.service = [];
        }

        const hasService = app.service.some(
            s => s.$['android:name'] === '.TeleCRMInCallService'
        );

        if (!hasService) {
            app.service.push({
                $: {
                    'android:name': '.TeleCRMInCallService',
                    'android:permission': 'android.permission.BIND_INCALL_SERVICE',
                    'android:exported': 'true',
                    // Foreground service type required for Android 14+
                    'android:foregroundServiceType': 'phoneCall'
                },
                'meta-data': [{
                    $: {
                        'android:name': 'android.telecom.IN_CALL_SERVICE_UI',
                        'android:value': 'true'
                    }
                }, {
                    $: {
                        'android:name': 'android.telecom.IN_CALL_SERVICE_RINGING',
                        'android:value': 'true'
                    }
                }],
                'intent-filter': [{
                    'action': [{ $: { 'android:name': 'android.telecom.InCallService' } }]
                }]
            });
        }

        // Add intent filters to MainActivity
        const mainActivity = app.activity.find(
            item => item.$['android:name'] === '.MainActivity'
        );

        if (mainActivity) {
            if (!mainActivity['intent-filter']) {
                mainActivity['intent-filter'] = [];
            }

            // Check if dial intent filter already exists
            const hasDialFilter = mainActivity['intent-filter'].some(filter =>
                filter.action && filter.action.some(action => action.$['android:name'] === 'android.intent.action.DIAL')
            );

            if (!hasDialFilter) {
                mainActivity['intent-filter'].push({
                    action: [
                        { $: { 'android:name': 'android.intent.action.DIAL' } },
                        { $: { 'android:name': 'android.intent.action.CALL' } }
                    ],
                    category: [
                        { $: { 'android:name': 'android.intent.category.DEFAULT' } }
                    ],
                    data: [
                        { $: { 'android:scheme': 'tel' } }
                    ]
                });
            }

            // Fallback for empty app dialing
            const hasMainDialFilter = mainActivity['intent-filter'].some(filter =>
                filter.action && filter.action.some(action => action.$['android:name'] === 'android.intent.action.DIAL') && 
                (!filter.data)
            );

            if (!hasMainDialFilter) {
                mainActivity['intent-filter'].push({
                    action: [
                        { $: { 'android:name': 'android.intent.action.DIAL' } }
                    ],
                    category: [
                        { $: { 'android:name': 'android.intent.category.DEFAULT' } }
                    ]
                });
            }
        }

        return config;
    });
};

const withDialerNativeFiles = (config) => {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const packageFolder = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', ...PACKAGE_PATH.split('/'));

            // Ensure directory exists
            fs.mkdirSync(packageFolder, { recursive: true });

            // Write files
            fs.writeFileSync(path.join(packageFolder, 'TeleCRMInCallService.kt'), TELECRM_SERVICE_KT);
            fs.writeFileSync(path.join(packageFolder, 'DialerModule.kt'), DIALER_MODULE_KT);
            fs.writeFileSync(path.join(packageFolder, 'DialerPackage.kt'), DIALER_PACKAGE_KT);

            return config;
        },
    ]);
};

const withDialerPackageLinking = (config) => {
    return withMainApplication(config, (config) => {
        let contents = config.modResults.contents;
        
        if (!contents.includes(`import ${PACKAGE_NAME}.DialerPackage`)) {
            if (contents.includes(`package ${PACKAGE_NAME}`)) {
                 contents = contents.replace(
                    `package ${PACKAGE_NAME}`, 
                    `package ${PACKAGE_NAME}\n\nimport ${PACKAGE_NAME}.DialerPackage`
                 );
            }
        }

        if (!contents.includes('add(DialerPackage())')) {
            if (contents.includes('PackageList(this).packages.apply {')) {
                contents = contents.replace(
                    'PackageList(this).packages.apply {',
                    'PackageList(this).packages.apply {\n              add(DialerPackage())'
                );
            } else if (contents.includes('return Arrays.<ReactPackage>asList(')) {
                 contents = contents.replace(
                    'return Arrays.<ReactPackage>asList(',
                    'return Arrays.<ReactPackage>asList(\n          new DialerPackage(),'
                );
            }
        }
        
        config.modResults.contents = contents;
        return config;
    });
};

const withDialerSetup = (config) => {
    config = withDialerManifest(config);
    config = withDialerNativeFiles(config);
    config = withDialerPackageLinking(config);
    return config;
};

module.exports = withDialerSetup;
