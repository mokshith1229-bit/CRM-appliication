package com.vivtej.telecrm

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
            promise.reject("ROLE_REQUEST_FAILED", "Failed to request role: ${e.message}")
        }
    }

    @ReactMethod
    fun isDefaultDialer(promise: Promise) {
        try {
            val telecomManager = reactContext.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            val isDefault = reactContext.packageName == telecomManager.defaultDialerPackage
            promise.resolve(isDefault)
        } catch (e: Exception) {
            promise.reject("CHECK_FAILED", "Failed to check default dialer status: ${e.message}")
        }
    }
}
