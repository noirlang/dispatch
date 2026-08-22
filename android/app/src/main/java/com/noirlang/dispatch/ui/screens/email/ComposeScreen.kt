package com.noirlang.dispatch.ui.screens.email

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.noirlang.dispatch.data.api.ApiClient
import com.noirlang.dispatch.data.local.SessionManager
import com.noirlang.dispatch.data.model.SendEmailRequest
import com.noirlang.dispatch.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun ComposeScreen(
    initialTo: String = "",
    initialSubject: String = "",
    initialBody: String = "",
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val session = remember { SessionManager.getInstance(context) }
    val scope = rememberCoroutineScope()

    var to by remember { mutableStateOf(initialTo) }
    var cc by remember { mutableStateOf("") }
    var subject by remember { mutableStateOf(initialSubject) }
    var body by remember {
        val sig = session.currentUser?.defaultSignature?.let { "\n\n--\n$it" } ?: ""
        mutableStateOf(initialBody.ifBlank { sig })
    }
    var isSending by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

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
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Filled.Close, "Kapat", tint = TextPrimary)
                }

                Text(
                    text = "Yeni E-Posta",
                    color = TextPrimary,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )

                IconButton(
                    onClick = {
                        if (to.isBlank()) {
                            errorMessage = "Lütfen bir alıcı adresi girin."
                            return@IconButton
                        }

                        isSending = true
                        scope.launch {
                            try {
                                val res = ApiClient.getService(context).sendEmail(
                                    SendEmailRequest(to, cc.takeIf { it.isNotBlank() }, null, subject, body)
                                )
                                if (res.isSuccessful) {
                                    onDismiss()
                                } else {
                                    errorMessage = "Gönderilemedi."
                                }
                            } catch (e: Exception) {
                                errorMessage = "Hata: ${e.message}"
                            } finally {
                                isSending = false
                            }
                        }
                    },
                    enabled = !isSending
                ) {
                    if (isSending) {
                        CircularProgressIndicator(color = TextPrimary, modifier = Modifier.size(18.dp))
                    } else {
                        Icon(Icons.Filled.Send, "Gönder", tint = AccentBlue)
                    }
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            if (errorMessage != null) {
                Text(errorMessage!!, color = AccentRed, fontSize = 12.sp, modifier = Modifier.padding(bottom = 8.dp))
            }

            // To field
            OutlinedTextField(
                value = to,
                onValueChange = { to = it },
                label = { Text("Kime", color = TextDim) },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BorderLight,
                    unfocusedBorderColor = BorderColor,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedContainerColor = BgSecondary,
                    unfocusedContainerColor = BgSecondary
                ),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Subject field
            OutlinedTextField(
                value = subject,
                onValueChange = { subject = it },
                label = { Text("Konu", color = TextDim) },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BorderLight,
                    unfocusedBorderColor = BorderColor,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedContainerColor = BgSecondary,
                    unfocusedContainerColor = BgSecondary
                ),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Body field
            OutlinedTextField(
                value = body,
                onValueChange = { body = it },
                placeholder = { Text("E-posta içeriğinizi yazın (Markdown desteklenir)...", color = TextDim) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BorderLight,
                    unfocusedBorderColor = BorderColor,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedContainerColor = BgSecondary,
                    unfocusedContainerColor = BgSecondary
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            )
        }
    }
}
