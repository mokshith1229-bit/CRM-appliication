package com.vivtej.telecrm

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
