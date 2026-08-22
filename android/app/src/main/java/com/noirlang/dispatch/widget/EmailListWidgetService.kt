package com.noirlang.dispatch.widget

import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.noirlang.dispatch.R
import com.noirlang.dispatch.data.api.ApiClient
import com.noirlang.dispatch.data.local.SessionManager
import com.noirlang.dispatch.data.model.Email
import kotlinx.coroutines.runBlocking
import java.text.SimpleDateFormat
import java.util.*

class EmailListWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return EmailListRemoteViewsFactory(this.applicationContext)
    }
}

class EmailListRemoteViewsFactory(private val context: Context) : RemoteViewsService.RemoteViewsFactory {

    private var emailList: List<Email> = emptyList()

    override fun onCreate() {}

    override fun onDataSetChanged() {
        val session = SessionManager.getInstance(context)
        if (!session.isLoggedIn) {
            emailList = emptyList()
            return
        }

        try {
            runBlocking {
                val response = ApiClient.getService(context).getEmails("inbox")
                if (response.isSuccessful) {
                    emailList = response.body()?.take(20) ?: emptyList()
                }
            }
        } catch (e: Exception) {
            // Keep previous list on network glitch
        }
    }

    override fun onDestroy() {
        emailList = emptyList()
    }

    override fun getCount(): Int = emailList.size

    override fun getViewAt(position: Int): RemoteViews {
        if (position !in emailList.indices) return RemoteViews(context.packageName, R.layout.widget_email_item)

        val email = emailList[position]
        val views = RemoteViews(context.packageName, R.layout.widget_email_item)

        val sender = email.senderName.takeUnless { it.isNullOrBlank() } ?: email.from
        val timeFormatted = formatTime(email.createdAt)
        val subject = email.subject.takeUnless { it.isNullOrBlank() } ?: "(Konusuz)"

        views.setTextViewText(R.id.widget_item_sender, sender)
        views.setTextViewText(R.id.widget_item_time, timeFormatted)
        views.setTextViewText(R.id.widget_item_subject, subject)

        // Set FillInIntent for opening specific email
        val fillInIntent = Intent().apply {
            putExtra("email_id", email.id)
        }
        views.setOnClickFillInIntent(R.id.widget_item_container, fillInIntent)

        return views
    }

    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 1
    override fun getItemId(position: Int): Long = emailList.getOrNull(position)?.id ?: position.toLong()
    override fun hasStableIds(): Boolean = true

    private fun formatTime(isoDate: String): String {
        return try {
            val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
            val date = inputFormat.parse(isoDate) ?: Date()
            val outputFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
            outputFormat.format(date)
        } catch (e: Exception) {
            "12:00"
        }
    }
}
