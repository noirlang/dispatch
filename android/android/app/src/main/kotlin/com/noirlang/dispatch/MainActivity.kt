package com.noirlang.dispatch

import android.content.Context
import android.content.Intent
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val WIDGET_CHANNEL = "com.noirlang.dispatch/widget"
    private var pendingOpenEmailId: Int? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        if (intent != null && intent.hasExtra("open_email_id")) {
            val emailId = intent.getIntExtra("open_email_id", 0)
            if (emailId > 0) {
                pendingOpenEmailId = emailId
                flutterEngine?.dartExecutor?.binaryMessenger?.let {
                    MethodChannel(it, WIDGET_CHANNEL).invokeMethod("onOpenEmail", emailId)
                }
            }
        }
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, WIDGET_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "updateWidgetData" -> {
                    val args = call.arguments as? Map<*, *>
                    if (args != null) {
                        val prefs = getSharedPreferences("dispatch_widget_data", Context.MODE_PRIVATE)
                        val editor = prefs.edit()

                        editor.putInt("unread_count", (args["unread_count"] as? Number)?.toInt() ?: 0)

                        editor.putInt("m1_id", (args["m1_id"] as? Number)?.toInt() ?: 0)
                        editor.putString("m1_sender", args["m1_sender"] as? String ?: "")
                        editor.putString("m1_initials", args["m1_initials"] as? String ?: "D")
                        editor.putString("m1_subject", args["m1_subject"] as? String ?: "")
                        editor.putString("m1_snippet", args["m1_snippet"] as? String ?: "")
                        editor.putString("m1_time", args["m1_time"] as? String ?: "")

                        editor.putInt("m2_id", (args["m2_id"] as? Number)?.toInt() ?: 0)
                        editor.putString("m2_sender", args["m2_sender"] as? String ?: "")
                        editor.putString("m2_initials", args["m2_initials"] as? String ?: "D")
                        editor.putString("m2_subject", args["m2_subject"] as? String ?: "")
                        editor.putString("m2_snippet", args["m2_snippet"] as? String ?: "")
                        editor.putString("m2_time", args["m2_time"] as? String ?: "")

                        editor.apply()

                        InboxWidgetProvider.updateAllWidgets(this)
                        result.success(true)
                    } else {
                        result.error("INVALID_ARGS", "Arguments must be a Map", null)
                    }
                }
                "getInitialEmailId" -> {
                    val id = pendingOpenEmailId
                    pendingOpenEmailId = null
                    result.success(id)
                }
                else -> result.notImplemented()
            }
        }
    }
}
