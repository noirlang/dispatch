package com.noirlang.dispatch.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.noirlang.dispatch.R
import com.noirlang.dispatch.data.api.ApiClient
import com.noirlang.dispatch.data.local.SessionManager
import com.noirlang.dispatch.ui.MainActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class EmailQuickWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateQuickWidget(context, appWidgetManager, appWidgetId)
        }
        super.onUpdate(context, appWidgetManager, appWidgetIds)
    }

    companion object {
        fun updateQuickWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_email_quick)

            val appIntent = Intent(context, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(
                context,
                10,
                appIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_quick_container, pendingIntent)

            val session = SessionManager.getInstance(context)
            if (session.isLoggedIn) {
                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        val response = ApiClient.getService(context).getEmails("inbox")
                        if (response.isSuccessful) {
                            val emails = response.body() ?: emptyList()
                            val unread = emails.count { !it.isRead }
                            val latest = emails.firstOrNull()

                            views.setTextViewText(R.id.widget_quick_badge, unread.toString())
                            views.setTextViewText(R.id.widget_quick_count_label, "$unread Okunmamış")
                            views.setTextViewText(
                                R.id.widget_quick_latest_subject,
                                latest?.subject ?: "Gelen kutunuz güncel"
                            )
                            appWidgetManager.updateAppWidget(appWidgetId, views)
                        }
                    } catch (e: Exception) {
                        // ignore network error in widget
                    }
                }
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
