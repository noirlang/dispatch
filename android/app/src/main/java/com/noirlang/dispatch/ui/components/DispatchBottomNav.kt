package com.noirlang.dispatch.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.noirlang.dispatch.ui.theme.*

enum class NavItem(
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    EMAIL("E-Posta", Icons.Filled.Mail, Icons.Outlined.Mail),
    CALENDAR("Takvim", Icons.Filled.CalendarMonth, Icons.Outlined.CalendarMonth),
    FEED("Akış (Feed)", Icons.Filled.RssFeed, Icons.Outlined.RssFeed),
    DASHBOARD("Pano", Icons.Filled.Dashboard, Icons.Outlined.Dashboard),
    SETTINGS("Ayarlar", Icons.Filled.Settings, Icons.Outlined.Settings)
}

@Composable
fun DispatchBottomNav(
    currentRoute: NavItem,
    onNavigate: (NavItem) -> Unit
) {
    NavigationBar(
        containerColor = BgPrimary,
        contentColor = TextPrimary,
        tonalElevation = 0.dp,
        modifier = Modifier
            .fillMaxWidth()
            .border(width = 0.5.dp, color = BorderColor)
    ) {
        NavItem.values().forEach { item ->
            val isSelected = currentRoute == item
            NavigationBarItem(
                selected = isSelected,
                onClick = { onNavigate(item) },
                icon = {
                    Icon(
                        imageVector = if (isSelected) item.selectedIcon else item.unselectedIcon,
                        contentDescription = item.title,
                        modifier = Modifier.size(20.dp),
                        tint = if (isSelected) TextPrimary else TextDim
                    )
                },
                label = {
                    Text(
                        text = item.title,
                        fontSize = 10.sp,
                        color = if (isSelected) TextPrimary else TextDim,
                        fontWeight = if (isSelected) androidx.compose.ui.text.font.FontWeight.SemiBold else androidx.compose.ui.text.font.FontWeight.Normal
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    indicatorColor = Color.Transparent
                )
            )
        }
    }
}
