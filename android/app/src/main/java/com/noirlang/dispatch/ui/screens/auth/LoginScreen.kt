package com.noirlang.dispatch.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.noirlang.dispatch.data.api.ApiClient
import com.noirlang.dispatch.data.local.SessionManager
import com.noirlang.dispatch.data.model.LoginRequest
import com.noirlang.dispatch.ui.theme.*
import com.noirlang.dispatch.worker.MailSyncWorker
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onNavigateRegister: () -> Unit,
    onChangeServer: () -> Unit
) {
    val context = LocalContext.current
    val session = remember { SessionManager.getInstance(context) }
    val scope = rememberCoroutineScope()

    var emailOrUser by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
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
        Text(
            text = "Giriş Yap",
            color = TextPrimary,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold
        )

        Text(
            text = "@${session.serverDomain} sunucusuna bağlanıyorsunuz",
            color = TextSecondary,
            fontSize = 13.sp,
            modifier = Modifier.padding(top = 4.dp, bottom = 28.dp)
        )

        // Email or Username Input
        OutlinedTextField(
            value = emailOrUser,
            onValueChange = { emailOrUser = it; errorMessage = null },
            label = { Text("E-Posta veya Kullanıcı Adı", color = TextSecondary) },
            leadingIcon = { Icon(Icons.Filled.Email, "E-Posta", tint = TextSecondary) },
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = TextPrimary,
                unfocusedBorderColor = BorderColor,
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary,
                focusedContainerColor = BgSecondary,
                unfocusedContainerColor = BgSecondary
            ),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(14.dp))

        // Password Input
        OutlinedTextField(
            value = password,
            onValueChange = { password = it; errorMessage = null },
            label = { Text("Şifre", color = TextSecondary) },
            leadingIcon = { Icon(Icons.Filled.Lock, "Şifre", tint = TextSecondary) },
            visualTransformation = PasswordVisualTransformation(),
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = TextPrimary,
                unfocusedBorderColor = BorderColor,
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary,
                focusedContainerColor = BgSecondary,
                unfocusedContainerColor = BgSecondary
            ),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth()
        )

        if (errorMessage != null) {
            Text(
                text = errorMessage!!,
                color = AccentRed,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 10.dp)
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = {
                if (emailOrUser.isBlank() || password.isBlank()) {
                    errorMessage = "Lütfen bilgilerinizi eksiksiz girin."
                    return@Button
                }

                isLoading = true
                errorMessage = null

                val cleanEmail = if (emailOrUser.contains("@")) emailOrUser else "$emailOrUser@${session.serverDomain}"

                scope.launch {
                    try {
                        val response = ApiClient.getService(context).login(LoginRequest(cleanEmail, password))
                        if (response.isSuccessful) {
                            val body = response.body()
                            if (body?.token != null) {
                                session.authToken = body.token
                                session.currentUser = body.user
                                MailSyncWorker.schedule(context)
                                onLoginSuccess()
                            } else {
                                errorMessage = body?.error ?: "Giriş başarısız."
                            }
                        } else {
                            errorMessage = "Kullanıcı adı veya şifre hatalı."
                        }
                    } catch (e: Exception) {
                        errorMessage = "Sunucuya bağlanılamadı: ${e.message}"
                    } finally {
                        isLoading = false
                    }
                }
            },
            enabled = !isLoading,
            colors = ButtonDefaults.buttonColors(
                containerColor = TextPrimary,
                contentColor = BgPrimary
            ),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
        ) {
            if (isLoading) {
                CircularProgressIndicator(color = BgPrimary, modifier = Modifier.size(18.dp))
            } else {
                Text("Giriş Yap", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Row(
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth()
        ) {
            TextButton(onClick = onNavigateRegister) {
                Text("Hesap Oluştur", color = TextSecondary, fontSize = 13.sp)
            }

            TextButton(onClick = onChangeServer) {
                Text("Sunucuyu Değiştir", color = TextDim, fontSize = 13.sp)
            }
        }
    }
}
