package com.noirlang.dispatch.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import com.google.gson.Gson
import com.noirlang.dispatch.data.model.User

class SessionManager(private val context: Context) {

    private val prefs: SharedPreferences by lazy {
        try {
            val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
            EncryptedSharedPreferences.create(
                "dispatch_secure_prefs",
                masterKeyAlias,
                context,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            context.getSharedPreferences("dispatch_fallback_prefs", Context.MODE_PRIVATE)
        }
    }

    private val gson = Gson()

    companion object {
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_SERVER_DOMAIN = "server_domain"
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_USER_JSON = "user_json"
        private const val KEY_LAST_SYNC_TIME = "last_sync_time"

        @Volatile
        private var instance: SessionManager? = null

        fun getInstance(context: Context): SessionManager {
            return instance ?: synchronized(this) {
                instance ?: SessionManager(context.applicationContext).also { instance = it }
            }
        }
    }

    var serverUrl: String
        get() = prefs.getString(KEY_SERVER_URL, "") ?: ""
        set(value) {
            val clean = value.trim().removeSuffix("/")
            prefs.edit().putString(KEY_SERVER_URL, clean).apply()
        }

    var serverDomain: String
        get() = prefs.getString(KEY_SERVER_DOMAIN, "dispatch.local") ?: "dispatch.local"
        set(value) = prefs.edit().putString(KEY_SERVER_DOMAIN, value.trim().lowercase()).apply()

    var authToken: String?
        get() = prefs.getString(KEY_AUTH_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_AUTH_TOKEN, value).apply()

    var currentUser: User?
        get() {
            val json = prefs.getString(KEY_USER_JSON, null) ?: return null
            return try {
                gson.fromJson(json, User::class.java)
            } catch (e: Exception) {
                null
            }
        }
        set(value) {
            val json = if (value != null) gson.toJson(value) else null
            prefs.edit().putString(KEY_USER_JSON, json).apply()
        }

    var lastSyncTime: Long
        get() = prefs.getLong(KEY_LAST_SYNC_TIME, 0L)
        set(value) = prefs.edit().putLong(KEY_LAST_SYNC_TIME, value).apply()

    val isServerConfigured: Boolean
        get() = serverUrl.isNotBlank()

    val isLoggedIn: Boolean
        get() = isServerConfigured && !authToken.isNullOrBlank()

    fun logout() {
        prefs.edit()
            .remove(KEY_AUTH_TOKEN)
            .remove(KEY_USER_JSON)
            .apply()
    }

    fun clearAll() {
        prefs.edit().clear().apply()
    }
}
