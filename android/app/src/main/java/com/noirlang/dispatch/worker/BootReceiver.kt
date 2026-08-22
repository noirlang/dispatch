package com.noirlang.dispatch.worker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.noirlang.dispatch.data.local.SessionManager

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            val session = SessionManager.getInstance(context)
            if (session.isLoggedIn) {
                MailSyncWorker.schedule(context)
            }
        }
    }
}
