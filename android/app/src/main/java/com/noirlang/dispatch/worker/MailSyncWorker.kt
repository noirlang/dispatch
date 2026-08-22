package com.noirlang.dispatch.worker

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import androidx.work.*
import com.noirlang.dispatch.data.api.ApiClient
import com.noirlang.dispatch.data.local.SessionManager
import com.noirlang.dispatch.widget.EmailListWidgetProvider
import com.noirlang.dispatch.widget.EmailQuickWidgetProvider
import java.util.concurrent.TimeUnit

class MailSyncWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        val session = SessionManager.getInstance(context)
        if (!session.isLoggedIn) return Result.success()

        try {
            val api = ApiClient.getService(context)
            val response = api.getEmails("inbox")

            if (response.isSuccessful) {
                val emails = response.body() ?: emptyList()
                val lastSync = session.lastSyncTime

                // Find newly arrived unread emails since last sync
                val newEmails = emails.filter { !it.isRead }

                // Notify for latest unread email if received newly
                if (newEmails.isNotEmpty() && lastSync > 0) {
                    val newest = newEmails.first()
                    // If received recently
                    NotificationHelper.showNewEmailNotification(context, newest)
                }

                session.lastSyncTime = System.currentTimeMillis()

                // Trigger Widget Refresh
                updateAllWidgets()

                return Result.success()
            }
            return Result.retry()
        } catch (e: Exception) {
            return Result.retry()
        }
    }

    private fun updateAllWidgets() {
        val intentList = Intent(context, EmailListWidgetProvider::class.java).apply {
            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(
                ComponentName(context, EmailListWidgetProvider::class.java)
            )
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        }
        context.sendBroadcast(intentList)

        val intentQuick = Intent(context, EmailQuickWidgetProvider::class.java).apply {
            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(
                ComponentName(context, EmailQuickWidgetProvider::class.java)
            )
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        }
        context.sendBroadcast(intentQuick)
    }

    companion object {
        private const val WORK_NAME = "dispatch_mail_sync_worker"

        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val periodicRequest = PeriodicWorkRequestBuilder<MailSyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                periodicRequest
            )
        }

        fun triggerNow(context: Context) {
            val oneTime = OneTimeWorkRequestBuilder<MailSyncWorker>()
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build()
            WorkManager.getInstance(context).enqueue(oneTime)
        }
    }
}
