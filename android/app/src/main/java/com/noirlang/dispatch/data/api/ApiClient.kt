package com.noirlang.dispatch.data.api

import android.content.Context
import com.noirlang.dispatch.data.local.SessionManager
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    private var currentBaseUrl: String? = null
    private var cachedService: DispatchApiService? = null

    fun getService(context: Context): DispatchApiService {
        val session = SessionManager.getInstance(context)
        var rawUrl = session.serverUrl.ifBlank { "http://10.0.2.2:3000" }.trim()
        if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
            rawUrl = if (rawUrl.contains("localhost") || rawUrl.contains("10.0.2.2") || rawUrl.contains("192.168.") || rawUrl.contains("127.0.0.1")) {
                "http://$rawUrl"
            } else {
                "https://$rawUrl"
            }
        }
        val normalizedUrl = if (rawUrl.endsWith("/")) rawUrl else "$rawUrl/"


        if (cachedService != null && currentBaseUrl == normalizedUrl) {
            return cachedService!!
        }

        val authInterceptor = Interceptor { chain ->
            val original = chain.request()
            val requestBuilder = original.newBuilder()
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")

            session.authToken?.let { token ->
                requestBuilder.header("Authorization", "Bearer $token")
            }

            chain.proceed(requestBuilder.build())
        }

        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .writeTimeout(20, TimeUnit.SECONDS)
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl(normalizedUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        currentBaseUrl = normalizedUrl
        val service = retrofit.create(DispatchApiService::class.java)
        cachedService = service
        return service
    }

    fun invalidate() {
        cachedService = null
        currentBaseUrl = null
    }
}
