package com.noirlang.dispatch.ui.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.noirlang.dispatch.data.api.ApiClient
import com.noirlang.dispatch.data.local.SessionManager
import com.noirlang.dispatch.data.model.UpdateSettingsRequest
import com.noirlang.dispatch.data.model.User
import com.noirlang.dispatch.ui.theme.*
import kotlinx.coroutines.launch

private val DEFAULT_MODELS_BY_PROVIDER = mapOf(
    "gemini" to listOf(
        "gemini-2.0-flash" to "Gemini 2.0 Flash (Önerilen & Çok Hızlı)",
        "gemini-1.5-flash" to "Gemini 1.5 Flash",
        "gemini-1.5-pro" to "Gemini 1.5 Pro (Gelişmiş)"
    ),
    "openai" to listOf(
        "gpt-4o-mini" to "GPT-4o Mini (Hızlı & Ekonomik)",
        "gpt-4o" to "GPT-4o (Gelişmiş)",
        "o3-mini" to "o3-mini (Akıl Yürütme)"
    ),
    "claude" to listOf(
        "claude-3-5-sonnet-latest" to "Claude 3.5 Sonnet (En Yetenekli)",
        "claude-3-5-haiku-latest" to "Claude 3.5 Haiku (Ultra Hızlı)"
    )
)

@Composable
fun SettingsScreen(
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    val session = remember { SessionManager.getInstance(context) }
    val scope = rememberCoroutineScope()

    var signature by remember { mutableStateOf(session.currentUser?.defaultSignature ?: "") }
    var selectedProvider by remember { mutableStateOf(session.currentUser?.aiProvider ?: "gemini") }
    var selectedModel by remember { mutableStateOf(session.currentUser?.aiModel ?: "") }
    var apiKeyInput by remember { mutableStateOf("") }
    var approvalEnabled by remember { mutableStateOf(session.currentUser?.approvalSystemEnabled ?: true) }
    var spyPixelEnabled by remember { mutableStateOf(session.currentUser?.spyPixelBlocking ?: true) }
    
    var isSaving by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var isError by remember { mutableStateOf(false) }
    var liveFetchedModels by remember { mutableStateOf<List<Pair<String, String>>>(emptyList()) }
    var isTestingAi by remember { mutableStateOf(false) }
    var aiTestResult by remember { mutableStateOf<String?>(null) }
    var aiTestSuccess by remember { mutableStateOf(false) }

    // Fetch fresh settings on mount
    LaunchedEffect(Unit) {
        try {
            val res = ApiClient.getService(context).getSettings()
            if (res.isSuccessful) {
                val body = res.body()
                if (body != null) {
                    body.defaultSignature?.let { signature = it }
                    body.aiProvider?.let { selectedProvider = it }
                    body.aiModel?.let { selectedModel = it }
                    approvalEnabled = body.approvalSystemEnabled
                    spyPixelEnabled = body.spyPixelBlocking
                    if (!body.availableModels.isNullOrEmpty()) {
                        liveFetchedModels = body.availableModels.map { it.id to (it.name ?: it.id) }
                    }
                }
            }
        } catch (e: Exception) {}
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgPrimary)
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            text = "Ayarlar",
            color = TextPrimary,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 20.dp)
        )

        // 1. Profile Section
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(BgSecondary)
                .border(1.dp, BorderColor, RoundedCornerShape(14.dp))
                .padding(16.dp)
        ) {
            Column {
                Text(text = "Hesap Bilgileri", color = TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                Text(text = session.currentUser?.name ?: "Kullanıcı", color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Text(text = session.currentUser?.email ?: "", color = TextDim, fontSize = 13.sp)
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = "Sunucu: ${session.serverUrl}", color = TextDim, fontSize = 11.sp)
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        // 2. Privacy & Security Section
        Text(text = "Gizlilik ve Güvenlik", color = TextSecondary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))
        
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(BgSecondary)
                .border(1.dp, BorderColor, RoundedCornerShape(14.dp))
                .padding(16.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                // Spy Pixel
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Casus Piksel Engelleme", color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        Text("Dış takip piksellerini izole eder ve IP'nizi korur", color = TextDim, fontSize = 11.sp)
                    }
                    Switch(
                        checked = spyPixelEnabled,
                        onCheckedChange = { spyPixelEnabled = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = TextPrimary, checkedTrackColor = AccentGreen)
                    )
                }

                HorizontalDivider(color = BorderColor)

                // Sender Approval Queue
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Onay Kuyruğu (Approvals)", color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        Text("İlk kez yazan göndericiler önce onayınıza sunulur", color = TextDim, fontSize = 11.sp)
                    }
                    Switch(
                        checked = approvalEnabled,
                        onCheckedChange = { approvalEnabled = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = TextPrimary, checkedTrackColor = AccentGreen)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        // 3. AI Assistant Settings Section
        Text(text = "Yapay Zeka (AI) Asistanı", color = TextSecondary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(BgSecondary)
                .border(1.dp, BorderColor, RoundedCornerShape(14.dp))
                .padding(16.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("AI Sağlayıcı Seçimi", color = TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                
                // Provider selection chips
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("gemini" to "Gemini", "openai" to "OpenAI", "claude" to "Claude").forEach { (provKey, provLabel) ->
                        val isSelected = selectedProvider == provKey
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (isSelected) TextPrimary else BgTertiary)
                                .border(1.dp, if (isSelected) TextPrimary else BorderColor, RoundedCornerShape(10.dp))
                                .clickable {
                                    selectedProvider = provKey
                                    liveFetchedModels = emptyList()
                                    selectedModel = DEFAULT_MODELS_BY_PROVIDER[provKey]?.firstOrNull()?.first ?: ""
                                }
                                .padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = provLabel,
                                color = if (isSelected) BgPrimary else TextPrimary,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                // API Key Input
                Text("${selectedProvider.uppercase()} API Key", color = TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                OutlinedTextField(
                    value = apiKeyInput,
                    onValueChange = { apiKeyInput = it },
                    placeholder = { Text("API anahtarınızı yapıştırın...", color = TextDim) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BorderLight,
                        unfocusedBorderColor = BorderColor,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedContainerColor = BgPrimary,
                        unfocusedContainerColor = BgPrimary
                    ),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                // Test & Fetch Models Button
                OutlinedButton(
                    onClick = {
                        isTestingAi = true
                        aiTestResult = null
                        scope.launch {
                            try {
                                val testReq = mutableMapOf("provider" to selectedProvider)
                                if (apiKeyInput.isNotBlank()) testReq["api_key"] = apiKeyInput.trim()
                                if (selectedModel.isNotBlank()) testReq["ai_model"] = selectedModel.trim()

                                val res = ApiClient.getService(context).testAiConnection(testReq)
                                if (res.isSuccessful) {
                                    val body = res.body()
                                    val isOk = body?.get("success") as? Boolean ?: false
                                    if (isOk) {
                                        aiTestSuccess = true
                                        aiTestResult = body?.get("message")?.toString() ?: "Bağlantı başarılı!"
                                        val chosenModel = body?.get("model")?.toString()
                                        val rawModels = body?.get("models") as? List<*>
                                        if (!rawModels.isNullOrEmpty()) {
                                            val parsed = rawModels.mapNotNull { item ->
                                                when (item) {
                                                    is Map<*, *> -> {
                                                        val id = item["id"]?.toString() ?: ""
                                                        val name = item["name"]?.toString() ?: id
                                                        if (id.isNotBlank()) id to name else null
                                                    }
                                                    is String -> item to item
                                                    else -> null
                                                }
                                            }
                                            if (parsed.isNotEmpty()) {
                                                liveFetchedModels = parsed
                                                selectedModel = chosenModel ?: parsed.first().first
                                            }
                                        } else if (!chosenModel.isNullOrBlank()) {
                                            selectedModel = chosenModel
                                        }
                                        session.currentUser = session.currentUser?.copy(
                                            aiConfigured = true,
                                            aiProvider = selectedProvider,
                                            aiModel = selectedModel
                                        )
                                    } else {
                                        aiTestSuccess = false
                                        aiTestResult = body?.get("message")?.toString() ?: body?.get("error")?.toString() ?: "Bağlantı başarısız."
                                    }
                                } else {
                                    aiTestSuccess = false
                                    aiTestResult = "API anahtarı doğrulanamadı (HTTP ${res.code()})"
                                }
                            } catch (e: Exception) {
                                aiTestSuccess = false
                                aiTestResult = "Bağlantı hatası: ${e.message}"
                            } finally {
                                isTestingAi = false
                            }
                        }
                    },
                    border = androidx.compose.foundation.BorderStroke(1.dp, if (aiTestSuccess) AccentGreen else BorderColor),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (isTestingAi) {
                        CircularProgressIndicator(color = TextPrimary, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Bağlantı Test Ediliyor...", fontSize = 12.sp, color = TextPrimary)
                    } else {
                        Icon(Icons.Filled.CheckCircle, "Test", tint = if (aiTestSuccess) AccentGreen else TextSecondary, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Bağlantıyı Test Et & Modelleri Getir", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    }
                }

                if (aiTestResult != null) {
                    Text(
                        text = aiTestResult!!,
                        color = if (aiTestSuccess) AccentGreen else AccentRed,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                // Dynamic Model Selection List
                val currentProviderDefaults = DEFAULT_MODELS_BY_PROVIDER[selectedProvider] ?: emptyList()
                val availableModels = if (liveFetchedModels.isNotEmpty()) liveFetchedModels else currentProviderDefaults

                if (availableModels.isNotEmpty()) {
                    Text("Kullanılacak Model", color = TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        availableModels.take(8).forEach { (mId, mLabel) ->
                            val isModelSelected = selectedModel == mId || (selectedModel.isBlank() && mId == availableModels.first().first)
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (isModelSelected) BgTertiary else BgPrimary)
                                    .border(1.dp, if (isModelSelected) AccentBlue else BorderColor, RoundedCornerShape(10.dp))
                                    .clickable {
                                        selectedModel = mId
                                        // Auto-save model selection
                                        scope.launch {
                                            try {
                                                val autoReq = UpdateSettingsRequest(
                                                    aiProvider = selectedProvider,
                                                    aiModel = mId
                                                )
                                                ApiClient.getService(context).updateSettings(autoReq)
                                                session.currentUser = session.currentUser?.copy(
                                                    aiProvider = selectedProvider,
                                                    aiModel = mId
                                                )
                                            } catch (e: Exception) {}
                                        }
                                    }
                                    .padding(horizontal = 12.dp, vertical = 10.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = mLabel,
                                        color = if (isModelSelected) TextPrimary else TextSecondary,
                                        fontSize = 13.sp,
                                        fontWeight = if (isModelSelected) FontWeight.Bold else FontWeight.Normal
                                    )
                                    if (isModelSelected) {
                                        Icon(Icons.Filled.CheckCircle, "Seçili", tint = AccentBlue, modifier = Modifier.size(16.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        // 4. Default Signature Section
        Text(text = "Varsayılan E-Posta İmzası", color = TextSecondary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(
            value = signature,
            onValueChange = { signature = it },
            placeholder = { Text("Saygılarımla,\nAdınız", color = TextDim) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = BorderLight,
                unfocusedBorderColor = BorderColor,
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary,
                focusedContainerColor = BgSecondary,
                unfocusedContainerColor = BgSecondary
            ),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth().height(100.dp)
        )

        if (message != null) {
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = message!!,
                color = if (isError) AccentRed else AccentGreen,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Save Button
        Button(
            onClick = {
                isSaving = true
                message = null
                scope.launch {
                    try {
                        val effectiveModel = selectedModel.ifBlank {
                            DEFAULT_MODELS_BY_PROVIDER[selectedProvider]?.firstOrNull()?.first ?: ""
                        }
                        val req = UpdateSettingsRequest(
                            defaultSignature = signature,
                            aiProvider = selectedProvider,
                            aiModel = effectiveModel,
                            geminiKey = if (selectedProvider == "gemini") apiKeyInput.takeIf { it.isNotBlank() } else null,
                            openaiKey = if (selectedProvider == "openai") apiKeyInput.takeIf { it.isNotBlank() } else null,
                            claudeKey = if (selectedProvider == "claude") apiKeyInput.takeIf { it.isNotBlank() } else null,
                            approvalSystemEnabled = approvalEnabled,
                            spyPixelBlocking = spyPixelEnabled
                        )
                        val updateRes = ApiClient.getService(context).updateSettings(req)
                        if (updateRes.isSuccessful) {
                            val respBody = updateRes.body()
                            session.currentUser = (session.currentUser ?: User(id = 0, name = "", email = "")).copy(
                                defaultSignature = signature,
                                aiProvider = selectedProvider,
                                aiModel = effectiveModel,
                                approvalSystemEnabled = approvalEnabled,
                                spyPixelBlocking = spyPixelEnabled,
                                aiConfigured = respBody?.aiConfigured ?: (session.currentUser?.aiConfigured ?: false)
                            )
                            message = "Tüm ayarlar başarıyla kaydedildi ✓"
                            isError = false
                            apiKeyInput = ""
                        } else {
                            message = "Kaydedilemedi (HTTP ${updateRes.code()})"
                            isError = true
                        }
                    } catch (e: Exception) {
                        message = "Kaydedilemedi: ${e.message}"
                        isError = true
                    } finally {
                        isSaving = false
                    }
                }
            },
            colors = ButtonDefaults.buttonColors(
                containerColor = TextPrimary,
                contentColor = BgPrimary
            ),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (isSaving) "Kaydediliyor..." else "Ayarları Kaydet", fontWeight = FontWeight.Bold)
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Logout button
        OutlinedButton(
            onClick = {
                scope.launch {
                    try {
                        ApiClient.getService(context).logout()
                    } catch (e: Exception) {}
                    session.logout()
                    onLogout()
                }
            },
            colors = ButtonDefaults.outlinedButtonColors(contentColor = AccentRed),
            border = androidx.compose.foundation.BorderStroke(1.dp, AccentRed.copy(alpha = 0.5f)),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.AutoMirrored.Filled.Logout, "Çıkış Yap", modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text("Oturumu Kapat", fontWeight = FontWeight.Bold)
        }

        Spacer(modifier = Modifier.height(36.dp))

        // Company & Version Footer
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "DISPATCH",
                color = TextSecondary,
                fontSize = 13.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 2.sp
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "v1.0.0 (Build 2026.08)",
                color = TextDim,
                fontSize = 11.sp,
                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "NOIRLANG TECHNOLOGIES",
                color = TextDim,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )
        }
    }
}
