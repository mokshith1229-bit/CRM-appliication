package com.vivtej.telecrm

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.telecom.TelecomManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class CallModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "CallModule"
    }

    @ReactMethod
    fun makeCall(phoneNumber: String, promise: Promise) {
        val activity = reactContext.currentActivity

        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity doesn't exist")
            return
        }

        // Check if CALL_PHONE permission is granted
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CALL_PHONE) 
            != PackageManager.PERMISSION_GRANTED) {
            promise.reject("PERMISSION_DENIED", "CALL_PHONE permission not granted")
            return
        }

        try {
            val intent = Intent(Intent.ACTION_CALL)
            intent.data = Uri.parse("tel:$phoneNumber")
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            activity.startActivity(intent)
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CALL_FAILED", "Failed to initiate call: ${e.message}")
        }
    }

    @ReactMethod
    fun checkCallPermission(promise: Promise) {
        val activity = reactContext.currentActivity
        val context = reactContext

        // Use activity if available, else context
        val contextToUse = activity ?: context

        val hasPermission = ContextCompat.checkSelfPermission(
            contextToUse,
            Manifest.permission.CALL_PHONE
        ) == PackageManager.PERMISSION_GRANTED

        promise.resolve(hasPermission)
    }

    @ReactMethod
    fun endCall(promise: Promise) {
        try {
            val activity = reactContext.currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Activity doesn't exist")
                return
            }

            val telecomManager = activity.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("END_CALL_FAILED", "Failed to end call: ${e.message}")
        }
    }

    @ReactMethod
    fun openDialer(phoneNumber: String, promise: Promise) {
        try {
            val activity = reactContext.currentActivity
            
            val intent = Intent(Intent.ACTION_DIAL)
            intent.data = Uri.parse("tel:$phoneNumber")
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            
            if (activity != null) {
                 activity.startActivity(intent)
            } else {
                 reactContext.startActivity(intent)
            }
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DIAL_FAILED", "Failed to open dialer: ${e.message}")
        }
    }
}
