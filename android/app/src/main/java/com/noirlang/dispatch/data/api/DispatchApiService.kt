package com.noirlang.dispatch.data.api

import com.noirlang.dispatch.data.model.*
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.*

interface DispatchApiService {

    // ─── Setup & Server Status ───
    @GET("api/v1/setup/status")
    suspend fun getServerStatus(): Response<ServerStatus>

    // ─── Auth ───
    @POST("api/v1/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("api/v1/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @GET("api/v1/auth/me")
    suspend fun getMe(): Response<Map<String, User>>

    @DELETE("api/v1/auth/logout")
    suspend fun logout(): Response<Map<String, String>>

    @GET("api/v1/auth/check_email")
    suspend fun checkEmail(@Query("email") email: String): Response<Map<String, Any>>

    // ─── Emails ───
    @GET("api/v1/emails")
    suspend fun getEmails(
        @Query("folder") folder: String = "inbox"
    ): Response<List<Email>>

    @GET("api/v1/emails/{id}")
    suspend fun getEmailDetail(@Path("id") id: Long): Response<Email>

    @POST("api/v1/emails")
    suspend fun sendEmail(@Body request: SendEmailRequest): Response<Email>

    @POST("api/v1/emails/save_draft")
    suspend fun saveDraft(@Body request: SendEmailRequest): Response<Email>


    @Multipart
    @POST("api/v1/attachments/upload")
    suspend fun uploadAttachment(@Part file: MultipartBody.Part): Response<Map<String, Any>>

    @DELETE("api/v1/emails/{id}")
    suspend fun deleteEmail(@Path("id") id: Long): Response<Map<String, String>>


    @POST("api/v1/emails/{id}/reply")
    suspend fun replyEmail(@Path("id") id: Long, @Body request: Map<String, String>): Response<Email>

    @POST("api/v1/emails/{id}/forward")
    suspend fun forwardEmail(@Path("id") id: Long, @Body request: Map<String, String>): Response<Email>

    @POST("api/v1/emails/{id}/approve")
    suspend fun approveSender(@Path("id") id: Long): Response<Map<String, String>>

    @POST("api/v1/emails/{id}/reject")
    suspend fun rejectSender(@Path("id") id: Long): Response<Map<String, String>>

    @POST("api/v1/emails/{id}/toggle_flag")
    suspend fun toggleFlag(@Path("id") id: Long): Response<Map<String, Boolean>>

    @POST("api/v1/emails/{id}/toggle_important_sender")
    suspend fun toggleImportantSender(@Path("id") id: Long): Response<Map<String, Any>>

    @POST("api/v1/emails/{id}/ai_summary")
    suspend fun getAiSummary(@Path("id") id: Long): Response<Map<String, String>>

    @POST("api/v1/emails/{id}/ai_reply")
    suspend fun generateAiReply(@Path("id") id: Long, @Body request: AiReplyRequest): Response<Map<String, String>>

    @POST("api/v1/emails/bulk_action")
    suspend fun bulkAction(@Body request: BulkEmailActionRequest): Response<Map<String, Any>>

    @POST("api/v1/emails/merge_threads")
    suspend fun mergeThreads(@Body request: Map<String, List<Long>>): Response<Map<String, Any>>

    // ─── Calendar ───
    @GET("api/v1/calendar/events")
    suspend fun getCalendarEvents(): Response<List<CalendarEvent>>

    @POST("api/v1/calendar/events")
    suspend fun createCalendarEvent(@Body request: CreateCalendarEventRequest): Response<CalendarEvent>

    @DELETE("api/v1/calendar/events/{id}")
    suspend fun deleteCalendarEvent(@Path("id") id: Long): Response<Map<String, String>>

    // ─── RSS Feed ───
    @GET("api/v1/rss/feeds")
    suspend fun getRssFeeds(): Response<List<RssFeed>>

    @POST("api/v1/rss/feeds")
    suspend fun createRssFeed(@Body request: CreateRssFeedRequest): Response<RssFeed>

    @DELETE("api/v1/rss/feeds/{id}")
    suspend fun deleteRssFeed(@Path("id") id: Long): Response<Map<String, String>>

    @GET("api/v1/rss/items")
    suspend fun getRssItems(
        @Query("feed_id") feedId: Long? = null,
        @Query("unread") unread: Boolean? = null
    ): Response<List<RssItem>>

    @PATCH("api/v1/rss/items/{id}/read")
    suspend fun markRssItemRead(@Path("id") id: Long): Response<RssItem>

    // ─── Dashboard (AI Pano) ───
    @GET("api/v1/dashboard")
    suspend fun getDashboardCards(): Response<List<DashboardCard>>

    @DELETE("api/v1/dashboard/{id}")
    suspend fun dismissDashboardCard(@Path("id") id: Long): Response<Map<String, String>>

    @POST("api/v1/dashboard/{id}/add_to_calendar")
    suspend fun addCardToCalendar(@Path("id") id: Long): Response<Map<String, Any>>

    // ─── Speakeasy Codes ───
    @GET("api/v1/speakeasy_codes")
    suspend fun getSpeakeasyCodes(): Response<List<SpeakeasyCode>>

    @POST("api/v1/speakeasy_codes")
    suspend fun createSpeakeasyCode(@Body request: CreateSpeakeasyCodeRequest): Response<SpeakeasyCode>

    @DELETE("api/v1/speakeasy_codes/{id}")
    suspend fun deleteSpeakeasyCode(@Path("id") id: Long): Response<Map<String, String>>

    // ─── Sender Rules ───
    @GET("api/v1/sender_rules")
    suspend fun getSenderRules(): Response<List<SenderRule>>

    @DELETE("api/v1/sender_rules/{id}")
    suspend fun deleteSenderRule(@Path("id") id: Long): Response<Map<String, String>>

    // ─── Settings ───
    @GET("api/v1/settings")
    suspend fun getSettings(): Response<Map<String, Any>>

    @PATCH("api/v1/settings")
    suspend fun updateSettings(@Body request: UpdateSettingsRequest): Response<Map<String, Any>>

    @POST("api/v1/settings/ai/test")
    suspend fun testAiConnection(@Body request: Map<String, String>): Response<Map<String, Any>>

    @Multipart
    @POST("api/v1/settings/upload_avatar")
    suspend fun uploadAvatar(@Part file: MultipartBody.Part): Response<Map<String, Any>>
}
