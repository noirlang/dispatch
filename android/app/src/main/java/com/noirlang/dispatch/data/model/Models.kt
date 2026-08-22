package com.noirlang.dispatch.data.model

import com.google.gson.annotations.SerializedName

data class User(
    val id: Long,
    val name: String,
    val email: String,
    @SerializedName("avatar_path") val avatarPath: String? = null,
    @SerializedName("default_signature") val defaultSignature: String? = null,
    val bio: String? = null,
    @SerializedName("ai_configured") val aiConfigured: Boolean = false,
    @SerializedName("ai_provider") val aiProvider: String? = null,
    @SerializedName("ai_model") val aiModel: String? = null,
    @SerializedName("approval_system_enabled") val approvalSystemEnabled: Boolean = true,
    @SerializedName("spy_pixel_blocking") val spyPixelBlocking: Boolean = true
)

data class AuthResponse(
    val token: String? = null,
    val user: User? = null,
    val error: String? = null,
    val message: String? = null
)

data class EmailAttachment(
    val id: String? = null,
    val filename: String,
    @SerializedName("content_type") val contentType: String? = null,
    val size: Long? = 0L,
    val url: String? = null,
    @SerializedName("is_image") val isImage: Boolean? = false
)

data class Email(
    val id: Long,
    val from: String,
    val to: String? = null,
    val cc: String? = null,
    val subject: String? = null,
    val body: String? = null,
    @SerializedName("body_text") val bodyText: String? = null,
    @SerializedName("body_html") val bodyHtml: String? = null,
    val folder: String = "inbox",
    @SerializedName("is_read") val isRead: Boolean = false,
    @SerializedName("is_flagged") val isFlagged: Boolean = false,
    @SerializedName("is_important_sender") val isImportantSender: Boolean = false,
    val attachments: List<EmailAttachment>? = null,
    @SerializedName("has_attachments") val hasAttachments: Boolean = false,
    @SerializedName("created_at") val createdAt: String,
    @SerializedName("sender_name") val senderName: String? = null,
    @SerializedName("avatar_url") val avatarUrl: String? = null,
    @SerializedName("avatar_initials") val avatarInitials: String? = null,
    @SerializedName("is_known_company") val isKnownCompany: Boolean = false,
    @SerializedName("is_dispatch_user") val isDispatchUser: Boolean = false
)


data class CalendarEvent(
    val id: Long,
    val title: String,
    val description: String? = null,
    val location: String? = null,
    @SerializedName("starts_at") val startsAt: String,
    @SerializedName("ends_at") val endsAt: String? = null,
    @SerializedName("all_day") val allDay: Boolean = false,
    val source: String? = "manual",
    val color: String? = "#3B82F6"
)

data class RssFeed(
    val id: Long,
    val url: String,
    val title: String? = null,
    val description: String? = null,
    val category: String? = null,
    @SerializedName("refresh_interval") val refreshInterval: Int = 15,
    @SerializedName("unread_count") val unreadCount: Int = 0,
    @SerializedName("item_count") val itemCount: Int = 0
)

data class RssItem(
    val id: Long,
    val title: String? = null,
    val content: String? = null,
    val url: String? = null,
    val author: String? = null,
    @SerializedName("published_at") val publishedAt: String? = null,
    @SerializedName("is_read") val isRead: Boolean = false,
    val starred: Boolean = false,
    @SerializedName("feed_title") val feedTitle: String? = null
)

data class DashboardCard(
    val id: Long,
    @SerializedName("card_type") val cardType: String = "general",
    val summary: String? = null,
    val priority: String = "low",
    val dismissed: Boolean = false,
    val language: String? = "tr",
    @SerializedName("actionable_items") val actionableItems: List<ActionableItem>? = null,
    @SerializedName("calendar_suggestion") val calendarSuggestion: CalendarSuggestion? = null,
    val tags: List<String>? = null
)

data class ActionableItem(
    val label: String,
    val value: String,
    val copyable: Boolean = true,
    val url: String? = null
)

data class CalendarSuggestion(
    val title: String,
    val date: String,
    val time: String? = "00:00",
    @SerializedName("all_day") val allDay: Boolean = false,
    val description: String? = null
)

data class SpeakeasyCode(
    val id: Long,
    val code: String,
    val label: String? = null,
    @SerializedName("expires_at") val expiresAt: String? = null,
    @SerializedName("single_use") val singleUse: Boolean = false,
    val used: Boolean = false
)

data class SenderRule(
    val id: Long,
    @SerializedName("email_address") val emailAddress: String,
    val status: String,
    @SerializedName("approved_at") val approvedAt: String? = null
)

data class ContactGroup(
    val id: Long,
    val name: String,
    val alias: String? = null,
    val description: String? = null,
    val color: String? = "#3b82f6",
    val members: List<String> = emptyList(),
    @SerializedName("member_count") val memberCount: Int = 0
)

data class ServerStatus(
    @SerializedName("is_configured") val isConfigured: Boolean,
    val domain: String,
    @SerializedName("mail_subdomain") val mailSubdomain: String,
    val ipv4: String,
    val mode: String
)

data class AiModelItem(
    val id: String,
    val name: String? = null
)

data class SettingsResponse(
    val name: String? = null,
    val email: String? = null,
    @SerializedName("avatar_path") val avatarPath: String? = null,
    val bio: String? = null,
    @SerializedName("approval_system_enabled") val approvalSystemEnabled: Boolean = true,
    @SerializedName("spy_pixel_blocking") val spyPixelBlocking: Boolean = true,
    @SerializedName("default_signature") val defaultSignature: String? = null,
    @SerializedName("ai_provider") val aiProvider: String? = "gemini",
    @SerializedName("ai_model") val aiModel: String? = null,
    @SerializedName("ai_configured") val aiConfigured: Boolean = false,
    @SerializedName("available_models") val availableModels: List<AiModelItem>? = null,
    @SerializedName("has_gemini_key") val hasGeminiKey: Boolean = false,
    @SerializedName("has_claude_key") val hasClaudeKey: Boolean = false,
    @SerializedName("has_openai_key") val hasOpenaiKey: Boolean = false
)

