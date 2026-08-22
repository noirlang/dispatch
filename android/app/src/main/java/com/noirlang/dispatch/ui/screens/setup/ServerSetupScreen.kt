package com.noirlang.dispatch.ui.screens.setup

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dns
import androidx.compose.material.icons.filled.Language
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.noirlang.dispatch.data.api.ApiClient
import com.noirlang.dispatch.data.local.SessionManager
import com.noirlang.dispatch.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun ServerSetupScreen(
    onConfigured: () -> Unit
) {
    val context = LocalContext.current
    val session = remember { SessionManager.getInstance(context) }
    val scope = rememberCoroutineScope()

    var serverUrl by remember { mutableStateOf(session.serverUrl.ifBlank { "http://10.0.2.2:3000" }) }
    var domain by remember { mutableStateOf(session.serverDomain.ifBlank { "dispatch.local" }) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgPrimary)
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Logo & Title
        Text(
            text = "⚡ DISPATCH",
            color = TextPrimary,
            fontSize = 28.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 2.sp
        )

        Text(
            text = "Sunucu ve Alan Adı Yapılandırması",
            color = TextSecondary,
            fontSize = 14.sp,
            modifier = Modifier.padding(top = 8.dp, bottom = 32.dp)
        )

        // Question 1: Server API URL (e.g. mail.noirlang.tr)
        OutlinedTextField(
            value = serverUrl,
            onValueChange = { serverUrl = it; errorMessage = null },
            label = { Text("Sunucu Adresi (API)", color = TextSecondary) },
            placeholder = { Text("https://mail.noirlang.tr veya http://IP:3000", color = TextDim) },
            leadingIcon = { Icon(Icons.Filled.Dns, "Sunucu", tint = AccentBlue) },
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = TextPrimary,
                unfocusedBorderColor = BorderColor,
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary,
                focusedContainerColor = BgSecondary,
                unfocusedContainerColor = BgSecondary
            ),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Question 2: Domain Name (e.g. noirlang.tr)
        OutlinedTextField(
            value = domain,
            onValueChange = { domain = it; errorMessage = null },
            label = { Text("E-Posta Alan Adı (Domain)", color = TextSecondary) },
            placeholder = { Text("noirlang.tr", color = TextDim) },
            leadingIcon = { Icon(Icons.Filled.Language, "Domain", tint = AccentGreen) },
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = TextPrimary,
                unfocusedBorderColor = BorderColor,
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary,
                focusedContainerColor = BgSecondary,
                unfocusedContainerColor = BgSecondary
            ),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        )

        if (errorMessage != null) {
            Text(
                text = errorMessage!!,
                color = AccentRed,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 12.dp)
            )
        }

        Spacer(modifier = Modifier.height(28.dp))

        Button(
            onClick = {
                if (serverUrl.isBlank() || domain.isBlank()) {
                    errorMessage = "Lütfen her iki alanı da doldurun."
                    return@Button
                }

                isLoading = true
                errorMessage = null

                session.serverUrl = serverUrl
                session.serverDomain = domain
                ApiClient.invalidate()

                scope.launch {
                    try {
                        val response = ApiClient.getService(context).getServerStatus()
                        if (response.isSuccessful) {
                            isLoading = false
                            onConfigured()
                        } else {
                            // Even if setup status endpoint returns other state, accept if host reachable
                            isLoading = false
                            onConfigured()
                        }
                    } catch (e: Exception) {
                        isLoading = false
                        // Allow proceeding in case offline or internal dev
                        onConfigured()
                    }
                }
            },
            enabled = !isLoading,
            colors = ButtonDefaults.buttonColors(
                containerColor = TextPrimary,
                contentColor = BgPrimary
            ),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
        ) {
            if (isLoading) {
                CircularProgressIndicator(color = BgPrimary, modifier = Modifier.size(20.dp))
            } else {
                Text(
                    text = "Bağlan ve Devam Et →",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
            }
        }
    }
}
