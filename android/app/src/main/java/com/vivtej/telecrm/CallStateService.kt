package com.vivtej.telecrm

import android.content.Intent
import android.os.Bundle
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class CallStateService : HeadlessJsTaskService() {

    override fun getTaskConfig(intent: Intent): HeadlessJsTaskConfig? {
        val extras = intent.extras ?: Bundle()
        return HeadlessJsTaskConfig(
            "CallStateTask",
            Arguments.fromBundle(extras),
            5000, // timeout for the task
            true // allowed in foreground
        )
    }
}
