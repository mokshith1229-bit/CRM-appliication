package com.vivtej.telecrm

import android.Manifest
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.telecom.TelecomManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.*

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

    @ReactMethod
    fun scheduleDailySync(promise: Promise) {
        try {
            val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(reactContext, CallReceiver::class.java)
            intent.action = "com.vivtej.telecrm.SYNC_DAILY"

            val pendingIntent = PendingIntent.getBroadcast(
                reactContext,
                100,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Set to 9:00 PM
            val calendar = Calendar.getInstance().apply {
                timeInMillis = System.currentTimeMillis()
                set(Calendar.HOUR_OF_DAY, 21)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                
                // If it's already past 9 PM, schedule for tomorrow
                if (before(Calendar.getInstance())) {
                    add(Calendar.DAY_OF_YEAR, 1)
                }
            }

            // RTC_WAKEUP wake up the device even if it's in doze mode
            alarmManager.setRepeating(
                AlarmManager.RTC_WAKEUP,
                calendar.timeInMillis,
                AlarmManager.INTERVAL_DAY,
                pendingIntent
            )

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ALARM_FAILED", "Failed to schedule daily sync: ${e.message}")
        }
    }
}
