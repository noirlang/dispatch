package com.noirlang.dispatch

import android.app.Application
import com.noirlang.dispatch.data.local.SessionManager
import com.noirlang.dispatch.worker.MailSyncWorker
import com.noirlang.dispatch.worker.NotificationHelper

class DispatchApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        // 1. Create notification channels
        NotificationHelper.createNotificationChannels(this)

        // 2. Schedule background mail sync worker if logged in
        val session = SessionManager.getInstance(this)
        if (session.isLoggedIn) {
            MailSyncWorker.schedule(this)
        }
    }
}
