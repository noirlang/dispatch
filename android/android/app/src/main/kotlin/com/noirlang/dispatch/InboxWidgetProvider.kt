package com.noirlang.dispatch

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews

class InboxWidgetProvider : AppWidgetProvider() {

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val action = intent.action
        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE == action ||
            AppWidgetManager.ACTION_APPWIDGET_ENABLED == action ||
            "com.noirlang.dispatch.UPDATE_WIDGET" == action) {
            updateAllWidgets(context)
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        for (widgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, widgetId)
        }
    }

    override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle?) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        updateAppWidget(context, appWidgetManager, appWidgetId)
    }

    companion object {
        private const val PREFS_NAME = "dispatch_widget_data"

        fun updateAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context) ?: return
            val thisWidget = ComponentName(context, InboxWidgetProvider::class.java)
            val allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget) ?: return
            for (widgetId in allWidgetIds) {
                updateAppWidget(context, appWidgetManager, widgetId)
            }
        }

        private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val views = RemoteViews(context.packageName, R.layout.widget_inbox)

            val unreadCount = prefs.getInt("unread_count", 0)
            val m1Sender = prefs.getString("m1_sender", "") ?: ""
            val m1Initials = prefs.getString("m1_initials", "D") ?: "D"
            val m1Subject = prefs.getString("m1_subject", "") ?: ""
            val m1Snippet = prefs.getString("m1_snippet", "") ?: ""
            val m1Time = prefs.getString("m1_time", "") ?: ""
            val m1Id = prefs.getInt("m1_id", 0)

            val m2Sender = prefs.getString("m2_sender", "") ?: ""
            val m2Initials = prefs.getString("m2_initials", "D") ?: "D"
            val m2Subject = prefs.getString("m2_subject", "") ?: ""
            val m2Snippet = prefs.getString("m2_snippet", "") ?: ""
            val m2Time = prefs.getString("m2_time", "") ?: ""
            val m2Id = prefs.getInt("m2_id", 0)

            // Header unread badge
            if (unreadCount > 0) {
                views.setTextViewText(R.id.widget_unread_badge, "$unreadCount Okunmamış")
                views.setViewVisibility(R.id.widget_unread_badge, View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.widget_unread_badge, View.GONE)
            }

            // Click Intent to open App
            val headerIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val headerPendingIntent = PendingIntent.getActivity(
                context, 0, headerIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_header, headerPendingIntent)
            views.setOnClickPendingIntent(R.id.widget_empty_text, headerPendingIntent)
            views.setOnClickPendingIntent(R.id.widget_root, headerPendingIntent)

            if (m1Sender.isEmpty()) {
                // Initial Default State
                views.setViewVisibility(R.id.widget_empty_text, View.GONE)
                views.setViewVisibility(R.id.widget_mail_1, View.VISIBLE)
                views.setTextViewText(R.id.mail_1_avatar, "D")
                views.setTextViewText(R.id.mail_1_sender, "Dispatch")
                views.setTextViewText(R.id.mail_1_subject, "Gelen Kutusu")
                views.setTextViewText(R.id.mail_1_snippet, "E-postaları görüntülemek için dokunun")
                views.setTextViewText(R.id.mail_1_time, "")
                views.setOnClickPendingIntent(R.id.widget_mail_1, headerPendingIntent)

                views.setViewVisibility(R.id.widget_divider_2, View.GONE)
                views.setViewVisibility(R.id.widget_mail_2, View.GONE)
            } else {
                views.setViewVisibility(R.id.widget_empty_text, View.GONE)
                views.setViewVisibility(R.id.widget_mail_1, View.VISIBLE)

                views.setTextViewText(R.id.mail_1_avatar, m1Initials)
                views.setTextViewText(R.id.mail_1_sender, m1Sender)
                views.setTextViewText(R.id.mail_1_subject, m1Subject)
                views.setTextViewText(R.id.mail_1_snippet, m1Snippet)
                views.setTextViewText(R.id.mail_1_time, m1Time)

                val mail1Intent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtra("open_email_id", m1Id)
                }
                val mail1PendingIntent = PendingIntent.getActivity(
                    context, 1, mail1Intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_mail_1, mail1PendingIntent)

                if (m2Sender.isNotEmpty()) {
                    views.setViewVisibility(R.id.widget_divider_2, View.VISIBLE)
                    views.setViewVisibility(R.id.widget_mail_2, View.VISIBLE)

                    views.setTextViewText(R.id.mail_2_avatar, m2Initials)
                    views.setTextViewText(R.id.mail_2_sender, m2Sender)
                    views.setTextViewText(R.id.mail_2_subject, m2Subject)
                    views.setTextViewText(R.id.mail_2_snippet, m2Snippet)
                    views.setTextViewText(R.id.mail_2_time, m2Time)

                    val mail2Intent = Intent(context, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        putExtra("open_email_id", m2Id)
                    }
                    val mail2PendingIntent = PendingIntent.getActivity(
                        context, 2, mail2Intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.widget_mail_2, mail2PendingIntent)
                } else {
                    views.setViewVisibility(R.id.widget_divider_2, View.GONE)
                    views.setViewVisibility(R.id.widget_mail_2, View.GONE)
                }
            }

            try {
                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (_: Exception) {}
        }
    }
}
