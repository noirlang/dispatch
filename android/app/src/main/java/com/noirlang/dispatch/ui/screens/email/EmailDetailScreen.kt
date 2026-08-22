package com.noirlang.dispatch.ui.screens.email

import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.noirlang.dispatch.data.api.ApiClient
import com.noirlang.dispatch.data.model.AiReplyRequest
import com.noirlang.dispatch.data.model.Email
import com.noirlang.dispatch.ui.components.SenderAvatar
import com.noirlang.dispatch.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun EmailDetailScreen(
    emailId: Long,
    onBack: () -> Unit,
    onReply: (Email, String?) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var email by remember { mutableStateOf<Email?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var aiSummary by remember { mutableStateOf<String?>(null) }
    var isGeneratingAiReply by remember { mutableStateOf(false) }

    fun loadDetail() {
        scope.launch {
            try {
                val res = ApiClient.getService(context).getEmailDetail(emailId)
                if (res.isSuccessful) {
                    email = res.body()
                }
            } catch (e: Exception) {
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(emailId) {
        loadDetail()
    }

    Scaffold(
        containerColor = BgPrimary,
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Filled.ArrowBack, "Geri", tint = TextPrimary)
                }

                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    // AI Summary Trigger
                    IconButton(onClick = {
                        scope.launch {
                            try {
                                val res = ApiClient.getService(context).getAiSummary(emailId)
                                aiSummary = res.body()?.get("summary")
                            } catch (e: Exception) {}
                        }
                    }) {
                        Icon(Icons.Filled.AutoAwesome, "AI Özeti", tint = AccentYellow)
                    }

                    // Reply
                    IconButton(onClick = { email?.let { onReply(it, null) } }) {
                        Icon(Icons.Filled.Reply, "Yanıtla", tint = TextPrimary)
                    }

                    // Delete
                    IconButton(onClick = {
                        scope.launch {
                            ApiClient.getService(context).deleteEmail(emailId)
                            onBack()
                        }
                    }) {
                        Icon(Icons.Filled.Delete, "Sil", tint = AccentRed)
                    }
                }
            }
        }
    ) { padding ->
        if (isLoading || email == null) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = TextPrimary, modifier = Modifier.size(24.dp))
            }
        } else {
            val mail = email!!
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp)
            ) {
                // Subject
                Text(
                    text = mail.subject.takeUnless { it.isNullOrBlank() } ?: "(Konusuz E-Posta)",
                    color = TextPrimary,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                // Sender Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    SenderAvatar(
                        name = mail.senderName,
                        email = mail.from,
                        avatarUrl = mail.avatarUrl,
                        initials = mail.avatarInitials,
                        size = 42.dp
                    )

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = mail.senderName.takeUnless { it.isNullOrBlank() } ?: mail.from,
                            color = TextPrimary,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "Kime: ${mail.to ?: "Ben"}",
                            color = TextDim,
                            fontSize = 12.sp
                        )
                    }
                }

                HorizontalDivider(color = BorderColor, modifier = Modifier.padding(vertical = 14.dp))

                // AI Summary Card (If available or generated)
                AnimatedVisibility(visible = aiSummary != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 16.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(BgTertiary)
                            .border(1.dp, AccentYellow.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                            .padding(12.dp)
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.AutoAwesome, "AI", tint = AccentYellow, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Yapay Zeka Özeti", color = AccentYellow, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(text = aiSummary ?: "", color = TextPrimary, fontSize = 13.sp)
                        }
                    }
                }

                // Email Body
                if (!mail.bodyHtml.isNullOrBlank()) {
                    AndroidView(
                        factory = { ctx ->
                            WebView(ctx).apply {
                                webViewClient = WebViewClient()
                                settings.javaScriptEnabled = false
                                setBackgroundColor(0x00000000)
                                val styledHtml = """
                                    <html>
                                    <head>
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                    <style>
                                    body { color: #ffffff; background-color: #000000; font-family: -apple-system, sans-serif; font-size: 14px; line-height: 1.5; padding: 4px; word-wrap: break-word; }
                                    a { color: #3b82f6; }
                                    img { max-width: 100%; height: auto; }
                                    </style>
                                    </head>
                                    <body>${mail.bodyHtml}</body>
                                    </html>
                                """.trimIndent()
                                loadDataWithBaseURL(null, styledHtml, "text/html", "utf-8", null)
                            }
                        },
                        modifier = Modifier.fillMaxWidth().heightIn(min = 200.dp, max = 800.dp)
                    )
                } else {
                    Text(
                        text = mail.bodyText.takeUnless { it.isNullOrBlank() } ?: mail.body ?: "(İçerik yok)",
                        color = TextPrimary,
                        fontSize = 14.sp,
                        lineHeight = 22.sp
                    )
                }

                Spacer(modifier = Modifier.height(30.dp))

                // Bottom Action: AI Quick Reply button
                Button(
                    onClick = {
                        isGeneratingAiReply = true
                        scope.launch {
                            try {
                                val res = ApiClient.getService(context).generateAiReply(
                                    emailId,
                                    AiReplyRequest("Gelen e-postaya profesyonel ve samimi bir yanıt oluştur.", "friendly")
                                )
                                val generatedBody = res.body()?.get("reply_body")
                                onReply(mail, generatedBody)
                            } catch (e: Exception) {
                                onReply(mail, null)
                            } finally {
                                isGeneratingAiReply = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = BgTertiary,
                        contentColor = TextPrimary
                    ),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (isGeneratingAiReply) {
                        CircularProgressIndicator(color = TextPrimary, modifier = Modifier.size(16.dp))
                    } else {
                        Icon(Icons.Filled.AutoAwesome, "AI", tint = AccentYellow, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Yapay Zeka ile Otomatik Cevap Yaz", fontSize = 13.sp)
                    }
                }
            }
        }
    }
}
