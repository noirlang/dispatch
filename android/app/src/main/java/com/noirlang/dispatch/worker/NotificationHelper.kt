package com.noirlang.dispatch.worker

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.noirlang.dispatch.R
import com.noirlang.dispatch.data.model.Email
import com.noirlang.dispatch.ui.MainActivity

object NotificationHelper {

    const val CHANNEL_MAIL = "dispatch_mail_channel"
    const val CHANNEL_ALERT = "dispatch_alert_channel"

    fun createNotificationChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val mailChannel = NotificationChannel(
                CHANNEL_MAIL,
                "Yeni E-Postalar",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Yeni gelen e-posta bildirimleri"
                enableVibration(true)
            }

            val alertChannel = NotificationChannel(
                CHANNEL_ALERT,
                "Dispatch Bildirimleri",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Sistem ve takvim bildirimleri"
            }

            nm.createNotificationChannel(mailChannel)
            nm.createNotificationChannel(alertChannel)
        }
    }

    fun showNewEmailNotification(context: Context, email: Email) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("email_id", email.id)
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            email.id.toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val sender = email.senderName.takeUnless { it.isNullOrBlank() } ?: email.from
        val subject = email.subject.takeUnless { it.isNullOrBlank() } ?: "Konusuz E-Posta"
        val snippet = email.bodyText?.take(100) ?: "Yeni bir e-posta aldınız."

        val notification = NotificationCompat.Builder(context, CHANNEL_MAIL)
            .setSmallIcon(R.drawable.ic_dispatch_logo)
            .setContentTitle(sender)
            .setContentText(subject)
            .setStyle(NotificationCompat.BigTextStyle().bigText("$subject\n$snippet"))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(email.id.toInt(), notification)
    }
}
