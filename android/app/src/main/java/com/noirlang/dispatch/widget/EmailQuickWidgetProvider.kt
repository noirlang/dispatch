package com.noirlang.dispatch.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import com.noirlang.dispatch.R
import com.noirlang.dispatch.data.api.ApiClient
import com.noirlang.dispatch.data.local.SessionManager
import com.noirlang.dispatch.ui.MainActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

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

            val appIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
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

                            // Clean top-right badge: show only the count number if unread > 0, otherwise hide
                            if (unread > 0) {
                                views.setTextViewText(R.id.widget_quick_badge, unread.toString())
                                views.setViewVisibility(R.id.widget_quick_badge, View.VISIBLE)
                            } else {
                                views.setViewVisibility(R.id.widget_quick_badge, View.GONE)
                            }

                            val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())

                            if (emails.isEmpty()) {
                                views.setViewVisibility(R.id.widget_email_item_1, View.GONE)
                                views.setViewVisibility(R.id.widget_divider, View.GONE)
                                views.setViewVisibility(R.id.widget_email_item_2, View.GONE)
                                views.setViewVisibility(R.id.widget_empty_text, View.VISIBLE)
                            } else {
                                views.setViewVisibility(R.id.widget_empty_text, View.GONE)

                                // Email 1 (Son 1. Mail - Okunmuş veya Okunmamış)
                                val first = emails.getOrNull(0)
                                if (first != null) {
                                    views.setViewVisibility(R.id.widget_email_item_1, View.VISIBLE)
                                    val senderDisplay = first.senderName.takeUnless { it.isNullOrBlank() } ?: first.from.substringBefore("@")
                                    views.setTextViewText(R.id.widget_item_1_sender, senderDisplay)
                                    views.setTextViewText(R.id.widget_item_1_subject, first.subject.takeUnless { it.isNullOrBlank() } ?: "(Konu Yok)")
                                    
                                    val dateStr = first.createdAt?.let {
                                        try {
                                            val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).parse(it)
                                            iso?.let { d -> timeFormat.format(d) } ?: ""
                                        } catch (e: Exception) { "" }
                                    } ?: ""
                                    views.setTextViewText(R.id.widget_item_1_time, dateStr)

                                    // Contrast for read vs unread
                                    if (!first.isRead) {
                                        views.setTextColor(R.id.widget_item_1_sender, android.graphics.Color.parseColor("#FFFFFF"))
                                        views.setTextColor(R.id.widget_item_1_subject, android.graphics.Color.parseColor("#D4D4D8"))
                                    } else {
                                        views.setTextColor(R.id.widget_item_1_sender, android.graphics.Color.parseColor("#A1A1AA"))
                                        views.setTextColor(R.id.widget_item_1_subject, android.graphics.Color.parseColor("#71717A"))
                                    }
                                } else {
                                    views.setViewVisibility(R.id.widget_email_item_1, View.GONE)
                                }

                                // Email 2 (Son 2. Mail - Okunmuş veya Okunmamış)
                                val second = emails.getOrNull(1)
                                if (second != null) {
                                    views.setViewVisibility(R.id.widget_divider, View.VISIBLE)
                                    views.setViewVisibility(R.id.widget_email_item_2, View.VISIBLE)
                                    val senderDisplay2 = second.senderName.takeUnless { it.isNullOrBlank() } ?: second.from.substringBefore("@")
                                    views.setTextViewText(R.id.widget_item_2_sender, senderDisplay2)
                                    views.setTextViewText(R.id.widget_item_2_subject, second.subject.takeUnless { it.isNullOrBlank() } ?: "(Konu Yok)")
                                    
                                    val dateStr2 = second.createdAt?.let {
                                        try {
                                            val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).parse(it)
                                            iso?.let { d -> timeFormat.format(d) } ?: ""
                                        } catch (e: Exception) { "" }
                                    } ?: ""
                                    views.setTextViewText(R.id.widget_item_2_time, dateStr2)

                                    // Contrast for read vs unread
                                    if (!second.isRead) {
                                        views.setTextColor(R.id.widget_item_2_sender, android.graphics.Color.parseColor("#FFFFFF"))
                                        views.setTextColor(R.id.widget_item_2_subject, android.graphics.Color.parseColor("#D4D4D8"))
                                    } else {
                                        views.setTextColor(R.id.widget_item_2_sender, android.graphics.Color.parseColor("#A1A1AA"))
                                        views.setTextColor(R.id.widget_item_2_subject, android.graphics.Color.parseColor("#71717A"))
                                    }
                                } else {
                                    views.setViewVisibility(R.id.widget_divider, View.GONE)
                                    views.setViewVisibility(R.id.widget_email_item_2, View.GONE)
                                }
                            }


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

