package com.vivtej.telecrm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.util.Log

class CallReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        
        if (action == TelephonyManager.ACTION_PHONE_STATE_CHANGED) {
            val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
            
            // We specifically want to trigger sync when the call ends (goes back to IDLE state)
            if (state == TelephonyManager.EXTRA_STATE_IDLE) {
                Log.d("CallReceiver", "Phone state changed to IDLE. Call ended.")
                
                val serviceIntent = Intent(context, CallStateService::class.java)
                serviceIntent.putExtra("state", state)
                context.startService(serviceIntent)
                
                Log.d("CallReceiver", "Started CallStateService to trigger JS sync")
            }
        } else if (action == "com.vivtej.telecrm.SYNC_DAILY") {
            Log.d("CallReceiver", "Daily Sync triggered by Alarm.")
            
            val serviceIntent = Intent(context, CallStateService::class.java)
            serviceIntent.putExtra("state", "DAILY_SYNC")
            context.startService(serviceIntent)
        }
    }
}
