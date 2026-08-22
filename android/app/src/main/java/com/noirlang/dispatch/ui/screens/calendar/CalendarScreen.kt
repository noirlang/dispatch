package com.noirlang.dispatch.ui.screens.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.noirlang.dispatch.data.api.ApiClient
import com.noirlang.dispatch.data.model.CalendarEvent
import com.noirlang.dispatch.data.model.CreateCalendarEventRequest
import com.noirlang.dispatch.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalendarScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var events by remember { mutableStateOf<List<CalendarEvent>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showAddDialog by remember { mutableStateOf(false) }

    // Week navigation state
    var currentWeekOffset by remember { mutableStateOf(0) }

    val calendar = remember(currentWeekOffset) {
        Calendar.getInstance().apply {
            firstDayOfWeek = Calendar.MONDAY
            add(Calendar.WEEK_OF_YEAR, currentWeekOffset)
            set(Calendar.DAY_OF_WEEK, Calendar.MONDAY)
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
        }
    }

    val daysOfWeek = remember(currentWeekOffset) {
        val list = mutableListOf<Calendar>()
        val cal = calendar.clone() as Calendar
        for (i in 0 until 7) {
            list.add(cal.clone() as Calendar)
            cal.add(Calendar.DAY_OF_MONTH, 1)
        }
        list
    }

    val dayFormat = SimpleDateFormat("EEEE, d MMMM", Locale("tr"))
    val isoDateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    val todayIso = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())

    val weekHeaderFormat = SimpleDateFormat("d MMM", Locale("tr"))
    val weekTitle = "${weekHeaderFormat.format(daysOfWeek.first().time)} - ${weekHeaderFormat.format(daysOfWeek.last().time)}"

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
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Filled.CalendarMonth,
                        contentDescription = "Takvim",
                        tint = TextPrimary,
                        modifier = Modifier.size(22.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Takvim",
                        color = TextPrimary,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Week Switcher Controls
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(BgSecondary)
                        .border(1.dp, BorderColor, RoundedCornerShape(10.dp))
                        .padding(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    IconButton(
                        onClick = { currentWeekOffset-- },
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(Icons.Filled.ChevronLeft, "Önceki Hafta", tint = TextPrimary, modifier = Modifier.size(18.dp))
                    }

                    Text(
                        text = weekTitle,
                        color = TextPrimary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 6.dp)
                    )

                    IconButton(
                        onClick = { currentWeekOffset++ },
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(Icons.Filled.ChevronRight, "Sonraki Hafta", tint = TextPrimary, modifier = Modifier.size(18.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = TextPrimary, modifier = Modifier.size(24.dp))
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    items(daysOfWeek) { dayCal ->
                        val dayIso = isoDateFormat.format(dayCal.time)
                        val isToday = dayIso == todayIso
                        val dayEvents = events.filter { it.startsAt.startsWith(dayIso) }

                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(if (isToday) BgTertiary else BgSecondary)
                                .border(1.dp, if (isToday) TextPrimary.copy(alpha = 0.4f) else BorderColor, RoundedCornerShape(14.dp))
                                .padding(12.dp)
                        ) {
                            // Day Title
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = dayFormat.format(dayCal.time).replaceFirstChar { it.uppercase() },
                                    color = if (isToday) TextPrimary else TextSecondary,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                if (isToday) {
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(TextPrimary)
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text("BUGÜN", color = BgPrimary, fontSize = 9.sp, fontWeight = FontWeight.Black)
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            if (dayEvents.isEmpty()) {
                                Text(
                                    text = "Planlanmış etkinlik yok",
                                    color = TextDim,
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(vertical = 4.dp)
                                )
                            } else {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    dayEvents.forEach { ev ->
                                        CalendarEventCard(ev)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Add Event Dialog
    if (showAddDialog) {
        var newTitle by remember { mutableStateOf("") }
        var newDate by remember { mutableStateOf(todayIso) }
        var newTime by remember { mutableStateOf("10:00") }
        var newLocation by remember { mutableStateOf("") }
        var isSaving by remember { mutableStateOf(false) }

        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            containerColor = BgSecondary,
            title = { Text("Yeni Etkinlik Ekle", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = newTitle,
                        onValueChange = { newTitle = it },
                        label = { Text("Etkinlik Başlığı", color = TextSecondary) },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedBorderColor = TextPrimary,
                            unfocusedBorderColor = BorderColor
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = newDate,
                            onValueChange = { newDate = it },
                            label = { Text("Tarih (YYYY-AA-GG)", color = TextSecondary) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary,
                                focusedBorderColor = TextPrimary,
                                unfocusedBorderColor = BorderColor
                            ),
                            modifier = Modifier.weight(1.3f)
                        )

                        OutlinedTextField(
                            value = newTime,
                            onValueChange = { newTime = it },
                            label = { Text("Saat", color = TextSecondary) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary,
                                focusedBorderColor = TextPrimary,
                                unfocusedBorderColor = BorderColor
                            ),
                            modifier = Modifier.weight(0.7f)
                        )
                    }

                    OutlinedTextField(
                        value = newLocation,
                        onValueChange = { newLocation = it },
                        label = { Text("Konum (Opsiyonel)", color = TextSecondary) },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedBorderColor = TextPrimary,
                            unfocusedBorderColor = BorderColor
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newTitle.isBlank()) return@Button
                        isSaving = true
                        scope.launch {
                            try {
                                val startsAt = "${newDate}T${newTime}:00Z"
                                ApiClient.getService(context).createCalendarEvent(
                                    CreateCalendarEventRequest(
                                        title = newTitle,
                                        startsAt = startsAt,
                                        location = newLocation.takeIf { it.isNotBlank() }
                                    )
                                )
                                showAddDialog = false
                                loadEvents()
                            } catch (e: Exception) {
                            } finally {
                                isSaving = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = TextPrimary, contentColor = BgPrimary)
                ) {
                    Text(if (isSaving) "Kaydediliyor..." else "Ekle", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddDialog = false }) {
                    Text("İptal", color = TextDim)
                }
            }
        )
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
            .clip(RoundedCornerShape(10.dp))
            .background(BgPrimary)
            .border(1.dp, BorderColor, RoundedCornerShape(10.dp))
            .padding(10.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .height(34.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(eventColor)
            )

            Spacer(modifier = Modifier.width(10.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = event.title,
                        color = TextPrimary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold
                    )

                    val timeStr = try {
                        event.startsAt.substringAfter("T").take(5)
                    } catch (e: Exception) { "" }

                    if (timeStr.isNotBlank()) {
                        Text(
                            text = timeStr,
                            color = AccentBlue,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                if (!event.location.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.LocationOn, "Konum", tint = TextDim, modifier = Modifier.size(12.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = event.location,
                            color = TextDim,
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }
    }
}

