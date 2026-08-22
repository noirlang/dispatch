package com.noirlang.dispatch.ui.screens.settings

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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.noirlang.dispatch.data.api.ApiClient
import com.noirlang.dispatch.data.local.SessionManager
import com.noirlang.dispatch.data.model.UpdateSettingsRequest
import com.noirlang.dispatch.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    val session = remember { SessionManager.getInstance(context) }
    val scope = rememberCoroutineScope()

    var signature by remember { mutableStateOf(session.currentUser?.defaultSignature ?: "") }
    var geminiKey by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }

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

        // Profile Section
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

        Spacer(modifier = Modifier.height(16.dp))

        // Default Signature Section
        Text(text = "Varsayılan E-Posta İmzası", color = TextSecondary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(6.dp))
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

        Spacer(modifier = Modifier.height(16.dp))

        // Gemini AI API Key
        Text(text = "Google Gemini API Anahtarı", color = TextSecondary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(6.dp))
        OutlinedTextField(
            value = geminiKey,
            onValueChange = { geminiKey = it },
            placeholder = { Text("AI_zaSy...", color = TextDim) },
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = BorderLight,
                unfocusedBorderColor = BorderColor,
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary,
                focusedContainerColor = BgSecondary,
                unfocusedContainerColor = BgSecondary
            ),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        )

        if (message != null) {
            Text(text = message!!, color = AccentGreen, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
        }

        Spacer(modifier = Modifier.height(20.dp))

        Button(
            onClick = {
                isSaving = true
                scope.launch {
                    try {
                        val req = UpdateSettingsRequest(
                            defaultSignature = signature,
                            geminiKey = geminiKey.takeIf { it.isNotBlank() }
                        )
                        ApiClient.getService(context).updateSettings(req)
                        message = "Ayarlar başarıyla kaydedildi."
                    } catch (e: Exception) {
                        message = "Kaydedilemedi: ${e.message}"
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
            Icon(Icons.Filled.Logout, "Çıkış Yap", modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text("Oturumu Kapat", fontWeight = FontWeight.Bold)
        }
    }
}
