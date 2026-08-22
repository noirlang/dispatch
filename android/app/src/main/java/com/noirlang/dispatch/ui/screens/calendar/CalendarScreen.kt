package com.noirlang.dispatch.ui.screens.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Event
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.noirlang.dispatch.data.api.ApiClient
import com.noirlang.dispatch.data.model.CalendarEvent
import com.noirlang.dispatch.data.model.CreateCalendarEventRequest
import com.noirlang.dispatch.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun CalendarScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var events by remember { mutableStateOf<List<CalendarEvent>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showAddDialog by remember { mutableStateOf(false) }

    fun loadEvents() {
        isLoading = true
        scope.launch {
            try {
                val res = ApiClient.getService(context).getCalendarEvents()
                if (res.isSuccessful) {
                    events = res.body() ?: emptyList()
                }
            } catch (e: Exception) {
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadEvents()
    }

    Scaffold(
        containerColor = BgPrimary,
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = TextPrimary,
                contentColor = BgPrimary,
                shape = CircleShape
            ) {
                Icon(Icons.Filled.Add, "Etkinlik Ekle")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            Text(
                text = "Takvim",
                color = TextPrimary,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = TextPrimary, modifier = Modifier.size(24.dp))
                }
            } else if (events.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Henüz planlanmış bir etkinlik yok", color = TextDim, fontSize = 13.sp)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(events) { event ->
                        CalendarEventCard(event)
                    }
                }
            }
        }
    }
}

@Composable
fun CalendarEventCard(event: CalendarEvent) {
    val eventColor = try {
        Color(android.graphics.Color.parseColor(event.color ?: "#3B82F6"))
    } catch (e: Exception) {
        AccentBlue
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(BgSecondary)
            .border(1.dp, BorderColor, RoundedCornerShape(14.dp))
            .padding(14.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(42.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(eventColor)
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = event.title,
                    color = TextPrimary,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold
                )

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = event.startsAt.replace("T", " ").take(16),
                    color = TextSecondary,
                    fontSize = 12.sp
                )

                if (!event.description.isNullOrBlank()) {
                    Text(
                        text = event.description,
                        color = TextDim,
                        fontSize = 11.sp,
                        maxLines = 1
                    )
                }
            }
        }
    }
}
