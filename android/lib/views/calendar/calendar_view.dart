import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../models/calendar_event.dart';
import '../../providers/calendar_provider.dart';
import '../../theme/app_theme.dart';

class CalendarView extends StatelessWidget {
  const CalendarView({super.key});

  void _showAddEventModal(BuildContext context) {
    final titleController = TextEditingController();
    final locationController = TextEditingController();
    final descriptionController = TextEditingController();
    DateTime selectedDate = DateTime.now();
    TimeOfDay selectedTime = TimeOfDay.now();

    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.bgSecondary,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Yeni Etkinlik Oluştur',
                    style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.x, size: 18),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: titleController,
                style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
                decoration: const InputDecoration(labelText: 'Başlık', hintText: 'Örn: Ekip Toplantısı'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: locationController,
                style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
                decoration: const InputDecoration(labelText: 'Konum / Link', hintText: 'Örn: Google Meet / Ofis'),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(LucideIcons.calendar, size: 14),
                      label: Text(DateFormat('d MMM yyyy', 'tr').format(selectedDate)),
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: ctx,
                          initialDate: selectedDate,
                          firstDate: DateTime(2020),
                          lastDate: DateTime(2030),
                        );
                        if (picked != null) {
                          setModalState(() => selectedDate = picked);
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(LucideIcons.clock, size: 14),
                      label: Text(selectedTime.format(ctx)),
                      onPressed: () async {
                        final picked = await showTimePicker(
                          context: ctx,
                          initialTime: selectedTime,
                        );
                        if (picked != null) {
                          setModalState(() => selectedTime = picked);
                        }
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descriptionController,
                maxLines: 2,
                style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13),
                decoration: const InputDecoration(labelText: 'Açıklama', hintText: 'İsteğe bağlı detaylar...'),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.accent,
                  foregroundColor: AppTheme.accentInvert,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () async {
                  if (titleController.text.trim().isEmpty) return;
                  final finalDateTime = DateTime(
                    selectedDate.year,
                    selectedDate.month,
                    selectedDate.day,
                    selectedTime.hour,
                    selectedTime.minute,
                  );

                  await context.read<CalendarProvider>().createEvent(
                    title: titleController.text.trim(),
                    location: locationController.text.isNotEmpty ? locationController.text.trim() : null,
                    description: descriptionController.text.isNotEmpty ? descriptionController.text.trim() : null,
                    startsAt: finalDateTime,
                  );

                  if (ctx.mounted) Navigator.pop(ctx);
                },
                child: const Text('Etkinliği Kaydet', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final calendar = context.watch<CalendarProvider>();
    final events = calendar.events;

    // Group events by day
    final Map<String, List<CalendarEvent>> groupedEvents = {};
    for (var event in events) {
      final key = DateFormat('yyyy-MM-dd').format(event.startsAt);
      groupedEvents.putIfAbsent(key, () => []).add(event);
    }

    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(LucideIcons.calendar, size: 18, color: AppTheme.green),
            SizedBox(width: 8),
            Text('Dikey Takvim Akışı'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.plus, size: 20),
            onPressed: () => _showAddEventModal(context),
          ),
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18),
            onPressed: () => calendar.fetchEvents(forceRefresh: true),
          ),
          const SizedBox(width: 4),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'fab_calendar',
        backgroundColor: AppTheme.accent,
        foregroundColor: AppTheme.accentInvert,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        onPressed: () => _showAddEventModal(context),
        child: const Icon(LucideIcons.plus, size: 20),
      ),
      body: RefreshIndicator(
        color: AppTheme.textPrimary,
        backgroundColor: AppTheme.bgSecondary,
        onRefresh: () => calendar.fetchEvents(forceRefresh: true),
        child: events.isEmpty && !calendar.isLoading
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppTheme.bgSecondary,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppTheme.borderColor),
                      ),
                      child: const Icon(LucideIcons.calendar, size: 36, color: AppTheme.textDim),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Takvim Boş',
                      style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Henüz planlanmış bir etkinlik bulunmuyor.\nSağ alttaki + butonuyla yeni etkinlik ekleyebilirsiniz.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppTheme.textMuted, fontSize: 12, height: 1.4),
                    ),
                  ],
                ),
              )
            : ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                itemCount: groupedEvents.keys.length,
                itemBuilder: (ctx, idx) {
                  final dateKey = groupedEvents.keys.elementAt(idx);
                  final dayEvents = groupedEvents[dateKey]!;
                  final date = DateTime.parse(dateKey);
                  return _buildDaySection(context, date, dayEvents);
                },
              ),
      ),
    );
  }

  Widget _buildDaySection(BuildContext context, DateTime date, List<CalendarEvent> dayEvents) {
    final now = DateTime.now();
    final isToday = now.year == date.year && now.month == date.month && now.day == date.day;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Day Header
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isToday ? AppTheme.green.withOpacity(0.15) : AppTheme.bgTertiary,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: isToday ? AppTheme.green : AppTheme.borderColor),
                ),
                child: Text(
                  DateFormat('EEEE, d MMMM', 'tr').format(date).toUpperCase(),
                  style: TextStyle(
                    color: isToday ? AppTheme.green : AppTheme.textMuted,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              if (isToday)
                const Text(
                  'BUGÜN',
                  style: TextStyle(color: AppTheme.green, fontSize: 10, fontWeight: FontWeight.bold),
                ),
            ],
          ),
        ),

        // Events list for this day
        ...dayEvents.map((event) {
          final timeStr = DateFormat('HH:mm').format(event.startsAt);
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.bgSecondary,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.borderColor),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Time box
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.bgTertiary,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    event.allDay ? 'TÜM GÜN' : timeStr,
                    style: const TextStyle(
                      color: AppTheme.blue,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
                const SizedBox(width: 12),

                // Event details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        event.title,
                        style: const TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (event.location != null) ...[
                        const SizedBox(height: 3),
                        Row(
                          children: [
                            const Icon(LucideIcons.mapPin, size: 12, color: AppTheme.textMuted),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                event.location!,
                                style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                      if (event.description != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          event.description!,
                          style: const TextStyle(color: AppTheme.textDim, fontSize: 12),
                        ),
                      ],
                    ],
                  ),
                ),

                // Delete button
                IconButton(
                  icon: const Icon(LucideIcons.trash2, size: 14, color: AppTheme.textDim),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  onPressed: () {
                    context.read<CalendarProvider>().deleteEvent(event.id);
                  },
                ),
              ],
            ),
          );
        }),
      ],
    ).animate().fadeIn(duration: 250.ms);
  }
}
