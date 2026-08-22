package com.noirlang.dispatch.ui.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.noirlang.dispatch.data.model.DashboardCard
import com.noirlang.dispatch.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun DashboardScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var cards by remember { mutableStateOf<List<DashboardCard>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    fun loadCards() {
        scope.launch {
            try {
                val res = ApiClient.getService(context).getDashboardCards()
                if (res.isSuccessful) {
                    cards = res.body() ?: emptyList()
                }
            } catch (e: Exception) {
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadCards()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgPrimary)
            .padding(16.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(bottom = 16.dp)
        ) {
            Icon(Icons.Filled.Dashboard, "Pano", tint = TextPrimary, modifier = Modifier.size(22.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Pano",
                color = TextPrimary,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold
            )
        }


        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = TextPrimary, modifier = Modifier.size(24.dp))
            }
        } else if (cards.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Şu anda pano için bekleyen bir bildirim yok", color = TextDim, fontSize = 13.sp)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(cards) { card ->
                    DashboardItemCard(
                        card = card,
                        onDismiss = {
                            scope.launch {
                                ApiClient.getService(context).dismissDashboardCard(card.id)
                                loadCards()
                            }
                        },
                        onAddToCalendar = {
                            scope.launch {
                                ApiClient.getService(context).addCardToCalendar(card.id)
                                loadCards()
                            }
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun DashboardItemCard(
    card: DashboardCard,
    onDismiss: () -> Unit,
    onAddToCalendar: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(BgSecondary)
            .border(1.dp, BorderColor, RoundedCornerShape(14.dp))
            .padding(14.dp)
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = card.cardType.uppercase(),
                    color = AccentYellow,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )

                IconButton(onClick = onDismiss, modifier = Modifier.size(24.dp)) {
                    Icon(Icons.Filled.Close, "Kapat", tint = TextDim, modifier = Modifier.size(16.dp))
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = card.summary ?: "Ayrıntı yok",
                color = TextPrimary,
                fontSize = 14.sp
            )

            if (card.calendarSuggestion != null) {
                Spacer(modifier = Modifier.height(10.dp))
                Button(
                    onClick = onAddToCalendar,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = BgTertiary,
                        contentColor = AccentBlue
                    ),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Icon(Icons.Filled.CalendarMonth, "Takvim", modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Takvime Ekle", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
