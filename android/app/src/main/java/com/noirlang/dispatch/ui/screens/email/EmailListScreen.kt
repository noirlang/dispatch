package com.noirlang.dispatch.ui.screens.email

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.noirlang.dispatch.data.api.ApiClient
import com.noirlang.dispatch.data.model.BulkEmailActionRequest
import com.noirlang.dispatch.data.model.Email
import com.noirlang.dispatch.ui.components.BulkActionBar
import com.noirlang.dispatch.ui.components.SenderAvatar
import com.noirlang.dispatch.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun EmailListScreen(
    onEmailClick: (Long) -> Unit,
    onComposeClick: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var emails by remember { mutableStateOf<List<Email>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedFolder by remember { mutableStateOf("inbox") }
    var searchQuery by remember { mutableStateOf("") }
    var multiSelectMode by remember { mutableStateOf(false) }
    var selectedIds by remember { mutableStateOf<Set<Long>>(emptySet()) }
    var statusMessage by remember { mutableStateOf<String?>(null) }

    fun loadEmails() {
        isLoading = true
        scope.launch {
            try {
                val response = ApiClient.getService(context).getEmails(selectedFolder)
                if (response.isSuccessful) {
                    emails = response.body() ?: emptyList()
                }
            } catch (e: Exception) {
                // handle error
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(selectedFolder) {
        selectedIds = emptySet()
        loadEmails()
    }

    val filteredEmails = emails.filter { email ->
        val q = searchQuery.lowercase().trim()
        q.isEmpty() ||
                (email.subject?.lowercase()?.contains(q) == true) ||
                email.from.lowercase().contains(q) ||
                (email.senderName?.lowercase()?.contains(q) == true)
    }

    val folders = listOf(
        "inbox" to "Gelen",
        "approvals" to "Onay Bekleyenler",
        "sent" to "Gönderilenler",
        "drafts" to "Taslaklar",
        "trash" to "Çöp Kutusu"
    )

    fun executeBulkAction(actionType: String, folderTarget: String? = null) {
        if (selectedIds.isEmpty()) return
        scope.launch {
            try {
                val response = ApiClient.getService(context).bulkAction(
                    BulkEmailActionRequest(selectedIds.toList(), actionType, folderTarget)
                )
                if (response.isSuccessful) {
                    statusMessage = response.body()?.get("message")?.toString() ?: "İşlem tamamlandı"
                    selectedIds = emptySet()
                    multiSelectMode = false
                    loadEmails()
                }
            } catch (e: Exception) {
                statusMessage = "Hata: ${e.message}"
            }
        }
    }

    Scaffold(
        containerColor = BgPrimary,
        floatingActionButton = {
            FloatingActionButton(
                onClick = onComposeClick,
                containerColor = TextPrimary,
                contentColor = BgPrimary,
                shape = CircleShape,
                modifier = Modifier.size(56.dp)
            ) {
                Icon(Icons.Filled.Add, "E-Posta Yaz", modifier = Modifier.size(24.dp))
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(BgPrimary)
        ) {
            // Top Bar matching Image 0
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Dispatch Logo
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(
                        Icons.Filled.FlashOn,
                        contentDescription = "Dispatch Logo",
                        tint = TextPrimary,
                        modifier = Modifier.size(22.dp)
                    )
                    Text(
                        text = "DISPATCH",
                        color = TextPrimary,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.sp
                    )
                }

                IconButton(
                    onClick = { loadEmails() },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(Icons.Filled.Refresh, "Yenile", tint = TextSecondary, modifier = Modifier.size(18.dp))
                }
            }

            // Search Bar (Image 0)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 4.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(BgSecondary)
                    .border(1.dp, BorderColor, RoundedCornerShape(12.dp))
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Search, "Ara", tint = TextDim, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    androidx.compose.foundation.text.BasicTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        singleLine = true,
                        textStyle = LocalTextStyle.current.copy(color = TextPrimary, fontSize = 13.sp),
                        decorationBox = { innerTextField ->
                            if (searchQuery.isEmpty()) {
                                Text("E-postalarda ara...", color = TextDim, fontSize = 13.sp)
                            }
                            innerTextField()
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            // Folder Switcher Horizontal Pills
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                items(folders) { (key, label) ->
                    val isSelected = selectedFolder == key
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .background(if (isSelected) TextPrimary else BgTertiary)
                            .clickable { selectedFolder = key }
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = label,
                            color = if (isSelected) BgPrimary else TextSecondary,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                }
            }

            // Select bar + Select All Row (Image 0 & User Request)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable {
                        multiSelectMode = !multiSelectMode
                        if (!multiSelectMode) selectedIds = emptySet()
                    }
                ) {
                    Icon(
                        imageVector = if (multiSelectMode) Icons.Filled.CheckBox else Icons.Filled.CheckBoxOutlineBlank,
                        contentDescription = "Seç",
                        tint = if (multiSelectMode) TextPrimary else TextDim,
                        modifier = Modifier.size(16.dp)
                    )

                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Seç",
                        color = if (multiSelectMode) TextPrimary else TextDim,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )

                    if (multiSelectMode && filteredEmails.isNotEmpty()) {
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = if (selectedIds.size == filteredEmails.size) "Seçimi Kaldır" else "Tümünü Seç",
                            color = AccentBlue,
                            fontSize = 11.sp,
                            modifier = Modifier.clickable {
                                selectedIds = if (selectedIds.size == filteredEmails.size) emptySet()
                                else filteredEmails.map { it.id }.toSet()
                            }
                        )
                    }
                }
            }

            // Bulk Action Toolbar (Appears right under or beside selection)
            BulkActionBar(
                selectedCount = selectedIds.size,
                currentFolder = selectedFolder,
                onMarkRead = { executeBulkAction("mark_read") },
                onMarkUnread = { executeBulkAction("mark_unread") },
                onMoveInbox = { executeBulkAction("move_inbox") },
                onMoveTrash = { executeBulkAction("move_trash") },
                onToggleFlag = { executeBulkAction("toggle_flag") },
                onMergeThreads = {
                    if (selectedIds.size >= 2) {
                        scope.launch {
                            try {
                                ApiClient.getService(context).mergeThreads(mapOf("thread_ids" to selectedIds.toList()))
                                selectedIds = emptySet()
                                multiSelectMode = false
                                loadEmails()
                            } catch (e: Exception) {}
                        }
                    }
                }
            )

            // Email List Items matching Image 0
            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = TextPrimary, modifier = Modifier.size(24.dp))
                }
            } else if (filteredEmails.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Bu klasörde e-posta bulunmuyor", color = TextDim, fontSize = 13.sp)
                }
            } else {
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(filteredEmails, key = { it.id }) { email ->
                        val isChecked = selectedIds.contains(email.id)

                        EmailListItem(
                            email = email,
                            multiSelectMode = multiSelectMode,
                            isChecked = isChecked,
                            onToggleCheck = {
                                selectedIds = if (isChecked) selectedIds - email.id else selectedIds + email.id
                            },
                            onClick = {
                                if (multiSelectMode) {
                                    selectedIds = if (isChecked) selectedIds - email.id else selectedIds + email.id
                                } else {
                                    onEmailClick(email.id)
                                }
                            }
                        )
                        HorizontalDivider(color = BorderColor, thickness = 0.5.dp)
                    }
                }
            }
        }
    }
}

@Composable
fun EmailListItem(
    email: Email,
    multiSelectMode: Boolean,
    isChecked: Boolean,
    onToggleCheck: () -> Unit,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(if (isChecked) BgTertiary else BgPrimary)
            .clickable { onClick() }
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (multiSelectMode) {
            Checkbox(
                checked = isChecked,
                onCheckedChange = { onToggleCheck() },
                colors = CheckboxDefaults.colors(
                    checkedColor = TextPrimary,
                    checkmarkColor = BgPrimary,
                    uncheckedColor = BorderLight
                ),
                modifier = Modifier.padding(end = 6.dp)
            )
        }

        // Sender Avatar
        SenderAvatar(
            name = email.senderName,
            email = email.from,
            avatarUrl = email.avatarUrl,
            initials = email.avatarInitials,
            size = 40.dp
        )

        Spacer(modifier = Modifier.width(12.dp))

        // Center: Sender, Subject snippet
        Column(modifier = Modifier.weight(1f)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = email.senderName.takeUnless { it.isNullOrBlank() } ?: email.from,
                    color = TextPrimary,
                    fontSize = 14.sp,
                    fontWeight = if (!email.isRead) FontWeight.Bold else FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )

                // Paperclip icon if has attachments
                if (email.hasAttachments) {
                    Icon(
                        Icons.Filled.AttachFile,
                        "Ekli E-Posta",
                        tint = AccentBlue,
                        modifier = Modifier.size(13.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                }

                // Time ago
                Text(
                    text = formatTimeAgo(email.createdAt),
                    color = TextDim,
                    fontSize = 11.sp,
                    maxLines = 1
                )

            }

            Spacer(modifier = Modifier.height(2.dp))

            Text(
                text = email.subject.takeUnless { it.isNullOrBlank() } ?: "(Konusuz E-Posta)",
                color = if (!email.isRead) TextPrimary else TextSecondary,
                fontSize = 13.sp,
                fontWeight = if (!email.isRead) FontWeight.SemiBold else FontWeight.Normal,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }

        // Blue unread indicator dot (Image 0)
        if (!email.isRead) {
            Spacer(modifier = Modifier.width(8.dp))
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(AccentBlue)
            )
        }
    }
}

fun formatTimeAgo(isoDate: String): String {
    return try {
        val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val date = format.parse(isoDate) ?: return "az önce"
        val diff = (System.currentTimeMillis() - date.time) / 1000
        when {
            diff < 60 -> "az önce"
            diff < 3600 -> "${diff / 60} dakika önce"
            diff < 86400 -> "${diff / 3600} saat önce"
            else -> "${diff / 86400} gün önce"
        }
    } catch (e: Exception) {
        "az önce"
    }
}
