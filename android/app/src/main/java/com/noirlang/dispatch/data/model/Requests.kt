package com.noirlang.dispatch.data.model

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String,
    @SerializedName("password_confirmation") val passwordConfirmation: String,
    @SerializedName("invite_code") val inviteCode: String? = null
)

data class SendEmailRequest(
    val to: String,
    val cc: String? = null,
    val bcc: String? = null,
    val subject: String,
    val body: String,
    val attachments: List<EmailAttachment>? = null
)


data class BulkEmailActionRequest(
    val ids: List<Long>,
    @SerializedName("action_type") val actionType: String,
    val folder: String? = null
)

data class AiReplyRequest(
    val instructions: String,
    val tone: String = "friendly"
)

data class CreateCalendarEventRequest(
    val title: String,
    val description: String? = null,
    val location: String? = null,
    @SerializedName("starts_at") val startsAt: String,
    @SerializedName("ends_at") val endsAt: String? = null,
    @SerializedName("all_day") val allDay: Boolean = false,
    val color: String = "#3B82F6"
)

data class CreateRssFeedRequest(
    val url: String,
    val category: String? = null,
    @SerializedName("refresh_interval") val refreshInterval: Int = 15
)

data class CreateSpeakeasyCodeRequest(
    val label: String,
    @SerializedName("expires_in_days") val expiresInDays: Int = 7,
    @SerializedName("single_use") val singleUse: Boolean = false
)

data class UpdateSettingsRequest(
    val name: String? = null,
    @SerializedName("default_signature") val defaultSignature: String? = null,
    val bio: String? = null,
    @SerializedName("ai_provider") val aiProvider: String? = null,
    @SerializedName("ai_model") val aiModel: String? = null,
    @SerializedName("gemini_key") val geminiKey: String? = null,
    @SerializedName("claude_key") val claudeKey: String? = null,
    @SerializedName("openai_key") val openaiKey: String? = null,
    @SerializedName("approval_system_enabled") val approvalSystemEnabled: Boolean? = null,
    @SerializedName("spy_pixel_blocking") val spyPixelBlocking: Boolean? = null
)
