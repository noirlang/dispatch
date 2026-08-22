package com.noirlang.dispatch.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage

@Composable
fun SenderAvatar(
    name: String?,
    email: String,
    avatarUrl: String? = null,
    initials: String? = null,
    size: Dp = 40.dp
) {
    val displayInitials = initials?.take(2)?.uppercase()
        ?: name?.split(" ")?.mapNotNull { it.firstOrNull()?.toString() }?.take(2)?.joinToString("")?.uppercase()
        ?: email.firstOrNull()?.toString()?.uppercase()
        ?: "?"

    val colorIndex = Math.abs(email.hashCode()) % AVATAR_COLORS.size
    val bgColor = AVATAR_COLORS[colorIndex]

    Box(
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
            .background(bgColor),
        contentAlignment = Alignment.Center
    ) {
        if (!avatarUrl.isNullOrBlank()) {
            AsyncImage(
                model = avatarUrl,
                contentDescription = name ?: email,
                modifier = Modifier
                    .size(size)
                    .clip(CircleShape),
                contentScale = ContentScale.Crop
            )
        } else {
            Text(
                text = displayInitials,
                color = Color.White,
                fontSize = (size.value * 0.38f).sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

private val AVATAR_COLORS = listOf(
    Color(0xFF2563EB), // Blue
    Color(0xFF0D9488), // Teal
    Color(0xFF7C3AED), // Purple
    Color(0xFFD97706), // Amber
    Color(0xFFE11D48), // Rose
    Color(0xFF059669), // Emerald
    Color(0xFF4F46E5)  // Indigo
)
