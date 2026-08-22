package com.noirlang.dispatch.ui.screens.email

import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.Close
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
import com.noirlang.dispatch.data.model.EmailAttachment
import com.noirlang.dispatch.data.model.SendEmailRequest
import com.noirlang.dispatch.ui.theme.*
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.io.FileOutputStream

@OptIn(ExperimentalMaterial3Api::class)
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
        val sig = session.currentUser?.defaultSignature?.takeIf { it.isNotBlank() }?.let { "\n\n$it" } ?: ""
        val initialText = if (initialBody.isNotBlank()) {
            if (initialBody.contains("--- Orijinal İleti ---") || initialBody.contains("-----Original Message-----")) {
                "\n$sig\n\n$initialBody"
            } else {
                "$initialBody$sig"
            }
        } else {
            "\n$sig"
        }
        mutableStateOf(initialText)
    }
    var attachments by remember { mutableStateOf<List<EmailAttachment>>(emptyList()) }
    var isUploading by remember { mutableStateOf(false) }
    var isSending by remember { mutableStateOf(false) }
    var isSavingDraft by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var draftSavedNotice by remember { mutableStateOf(false) }

    // File picker launcher for Android device attachments
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetMultipleContents()
    ) { uris: List<Uri> ->
        if (uris.isNotEmpty()) {
            isUploading = true
            scope.launch {
                try {
                    uris.forEach { uri ->
                        val cursor = context.contentResolver.query(uri, null, null, null, null)
                        val nameIndex = cursor?.getColumnIndex(OpenableColumns.DISPLAY_NAME) ?: -1
                        val sizeIndex = cursor?.getColumnIndex(OpenableColumns.SIZE) ?: -1
                        cursor?.moveToFirst()
                        val filename = if (nameIndex >= 0) cursor?.getString(nameIndex) ?: "dosya" else "dosya"
                        val size = if (sizeIndex >= 0) cursor?.getLong(sizeIndex) ?: 0L else 0L
                        cursor?.close()

                        // Copy to temp file to upload
                        val tempFile = File(context.cacheDir, "upload_$filename")
                        context.contentResolver.openInputStream(uri)?.use { input ->
                            FileOutputStream(tempFile).use { output ->
                                input.copyTo(output)
                            }
                        }

                        val reqFile = tempFile.asRequestBody(context.contentResolver.getType(uri)?.toMediaTypeOrNull())
                        val part = MultipartBody.Part.createFormData("file", filename, reqFile)

                        val res = ApiClient.getService(context).uploadAttachment(part)
                        if (res.isSuccessful) {
                            val body = res.body()
                            val attMap = (body?.get("attachment") as? Map<*, *>)
                            val att = EmailAttachment(
                                id = attMap?.get("id") as? String,
                                filename = (attMap?.get("filename") as? String) ?: filename,
                                contentType = attMap?.get("content_type") as? String,
                                size = (attMap?.get("size") as? Number)?.toLong() ?: size,
                                url = attMap?.get("url") as? String,
                                isImage = attMap?.get("is_image") as? Boolean ?: false
                            )
                            attachments = attachments + att
                        }
                    }
                } catch (e: Exception) {
                    errorMessage = "Dosya yüklenemedi: ${e.message}"
                } finally {
                    isUploading = false
                }
            }
        }
    }

    Scaffold(
        containerColor = BgPrimary,
        topBar = {
            TopAppBar(
                title = { Text(if (draftSavedNotice) "Taslak Kaydedildi ✓" else "Yeni İleti", color = if (draftSavedNotice) AccentGreen else TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Filled.Close, "Kapat", tint = TextPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BgPrimary),
                actions = {
                    // Save as draft button
                    TextButton(
                        onClick = {
                            if (to.isBlank() && subject.isBlank() && body.isBlank()) return@TextButton
                            isSavingDraft = true
                            scope.launch {
                                try {
                                    ApiClient.getService(context).saveDraft(
                                        SendEmailRequest(
                                            to = to,
                                            subject = subject.ifBlank { "(Başlıksız Taslak)" },
                                            body = body,
                                            attachments = attachments
                                        )
                                    )
                                    draftSavedNotice = true
                                } catch (e: Exception) {
                                } finally {
                                    isSavingDraft = false
                                }
                            }
                        },
                        enabled = !isSavingDraft
                    ) {
                        Text(if (isSavingDraft) "..." else "Taslak", color = TextDim, fontSize = 13.sp)
                    }

                    // Attach file button
                    IconButton(
                        onClick = { filePickerLauncher.launch("*/*") },
                        enabled = !isUploading && !isSending
                    ) {
                        if (isUploading) {
                            CircularProgressIndicator(color = AccentBlue, modifier = Modifier.size(18.dp))
                        } else {
                            Icon(Icons.Filled.AttachFile, "Dosya Ekle", tint = AccentBlue)
                        }
                    }

                    // Send button
                    IconButton(
                        onClick = {
                            if (to.isBlank()) {
                                errorMessage = "Lütfen alıcı adresini girin."
                                return@IconButton
                            }

                            isSending = true
                            errorMessage = null

                            scope.launch {
                                try {
                                    val req = SendEmailRequest(
                                        to = to,
                                        cc = cc.takeIf { it.isNotBlank() },
                                        subject = subject,
                                        body = body,
                                        attachments = attachments
                                    )
                                    val res = ApiClient.getService(context).sendEmail(req)
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
                        enabled = !isSending && !isUploading
                    ) {
                        if (isSending) {
                            CircularProgressIndicator(color = TextPrimary, modifier = Modifier.size(18.dp))
                        } else {
                            Icon(Icons.AutoMirrored.Filled.Send, "Gönder", tint = TextPrimary)
                        }
                    }
                }
            )
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

            // Attached files horizontal scroll list
            if (attachments.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    itemsIndexed(attachments) { index, att ->
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(BgSecondary)
                                .border(1.dp, BorderColor, RoundedCornerShape(8.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.AttachFile, "Ek", tint = AccentBlue, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(att.filename, color = TextPrimary, fontSize = 12.sp, maxLines = 1)
                                Spacer(modifier = Modifier.width(6.dp))
                                IconButton(
                                    onClick = { attachments = attachments.filterIndexed { i, _ -> i != index } },
                                    modifier = Modifier.size(16.dp)
                                ) {
                                    Icon(Icons.Filled.Close, "Kaldır", tint = TextDim, modifier = Modifier.size(12.dp))
                                }
                            }
                        }
                    }
                }
            }

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
