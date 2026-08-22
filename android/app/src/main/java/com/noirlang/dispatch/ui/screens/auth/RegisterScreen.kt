package com.noirlang.dispatch.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
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
import com.noirlang.dispatch.data.model.RegisterRequest
import com.noirlang.dispatch.ui.theme.*
import com.noirlang.dispatch.worker.MailSyncWorker
import kotlinx.coroutines.launch

@Composable
fun RegisterScreen(
    onRegisterSuccess: () -> Unit,
    onNavigateLogin: () -> Unit
) {
    val context = LocalContext.current
    val session = remember { SessionManager.getInstance(context) }
    val scope = rememberCoroutineScope()

    var name by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordConfirm by remember { mutableStateOf("") }
    var inviteCode by remember { mutableStateOf("") }
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
            text = "Yeni Hesap Oluştur",
            color = TextPrimary,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold
        )

        Text(
            text = "@${session.serverDomain} üzerinde yeni posta kutusu",
            color = TextSecondary,
            fontSize = 13.sp,
            modifier = Modifier.padding(top = 4.dp, bottom = 24.dp)
        )

        // Full Name
        OutlinedTextField(
            value = name,
            onValueChange = { name = it; errorMessage = null },
            label = { Text("Ad Soyad", color = TextSecondary) },
            leadingIcon = { Icon(Icons.Filled.Person, "Ad", tint = TextSecondary) },
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

        Spacer(modifier = Modifier.height(10.dp))

        // Desired Username
        OutlinedTextField(
            value = username,
            onValueChange = { username = it; errorMessage = null },
            label = { Text("İstediğiniz E-Posta Adresi", color = TextSecondary) },
            placeholder = { Text("adiniz@${session.serverDomain}", color = TextDim) },
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

        Spacer(modifier = Modifier.height(10.dp))

        // Password
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

        Spacer(modifier = Modifier.height(10.dp))

        // Password Confirmation
        OutlinedTextField(
            value = passwordConfirm,
            onValueChange = { passwordConfirm = it; errorMessage = null },
            label = { Text("Şifre Tekrarı", color = TextSecondary) },
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

        Spacer(modifier = Modifier.height(20.dp))

        Button(
            onClick = {
                if (name.isBlank() || username.isBlank() || password.isBlank()) {
                    errorMessage = "Lütfen zorunlu alanları doldurun."
                    return@Button
                }
                if (password != passwordConfirm) {
                    errorMessage = "Şifreler birbiriyle uyuşmuyor."
                    return@Button
                }

                isLoading = true
                errorMessage = null

                val cleanEmail = if (username.contains("@")) username else "$username@${session.serverDomain}"

                scope.launch {
                    try {
                        val response = ApiClient.getService(context).register(
                            RegisterRequest(name, cleanEmail, password, passwordConfirm, inviteCode.takeIf { it.isNotBlank() })
                        )
                        if (response.isSuccessful) {
                            val body = response.body()
                            if (body?.token != null) {
                                session.authToken = body.token
                                session.currentUser = body.user
                                MailSyncWorker.schedule(context)
                                onRegisterSuccess()
                            } else {
                                errorMessage = body?.error ?: "Kayıt tamamlanamadı."
                            }
                        } else {
                            errorMessage = "Kayıt başarısız. Bu e-posta zaten kullanılıyor olabilir."
                        }
                    } catch (e: Exception) {
                        errorMessage = "Sunucu hatası: ${e.message}"
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
                Text("Kaydol ve Başla", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        TextButton(onClick = onNavigateLogin) {
            Text("Zaten hesabınız var mı? Giriş Yapın", color = TextSecondary, fontSize = 13.sp)
        }
    }
}
