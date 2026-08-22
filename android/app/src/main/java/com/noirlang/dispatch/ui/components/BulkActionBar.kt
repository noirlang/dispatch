package com.noirlang.dispatch.ui.components

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.noirlang.dispatch.ui.theme.*

@Composable
fun BulkActionBar(
    selectedCount: Int,
    currentFolder: String,
    onMarkRead: () -> Unit,
    onMarkUnread: () -> Unit,
    onMoveInbox: () -> Unit,
    onMoveTrash: () -> Unit,
    onToggleFlag: () -> Unit,
    onMergeThreads: () -> Unit
) {
    AnimatedVisibility(
        visible = selectedCount > 0,
        enter = fadeIn() + slideInVertically(),
        exit = fadeOut() + slideOutVertically()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(BgTertiary)
                .border(1.dp, BorderLight, RoundedCornerShape(12.dp))
                .padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "$selectedCount seçildi",
                color = TextSecondary,
                fontSize = 12.sp,
                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
            )

            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                // Mark Read
                IconButton(onClick = onMarkRead, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Filled.MarkEmailRead, "Okundu Yap", tint = TextPrimary, modifier = Modifier.size(18.dp))
                }

                // Mark Unread
                IconButton(onClick = onMarkUnread, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Filled.MarkEmailUnread, "Okunmadı Yap", tint = TextPrimary, modifier = Modifier.size(18.dp))
                }

                // Move to Inbox (useful from approvals/trash)
                if (currentFolder != "inbox") {
                    TextButton(
                        onClick = onMoveInbox,
                        contentPadding = PaddingValues(horizontal = 8.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Text("Gelen", color = AccentBlue, fontSize = 11.sp, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                    }
                }

                // Flag
                IconButton(onClick = onToggleFlag, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Filled.Flag, "Bayrakla", tint = AccentYellow, modifier = Modifier.size(18.dp))
                }

                // Delete / Trash
                IconButton(onClick = onMoveTrash, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Filled.Delete, "Sil", tint = AccentRed, modifier = Modifier.size(18.dp))
                }

                // Merge
                if (selectedCount >= 2) {
                    TextButton(
                        onClick = onMergeThreads,
                        contentPadding = PaddingValues(horizontal = 8.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Text("Birleştir", color = AccentGreen, fontSize = 11.sp, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                    }
                }
            }
        }
    }
}
