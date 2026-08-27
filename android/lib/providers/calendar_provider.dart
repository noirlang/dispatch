import 'package:flutter/material.dart';
import '../models/calendar_event.dart';
import '../services/api_service.dart';
import '../services/cache_service.dart';

class CalendarProvider extends ChangeNotifier {
  List<CalendarEvent> _events = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<CalendarEvent> get events => _events;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchEvents({bool forceRefresh = false}) async {
    _errorMessage = null;

    final cached = await CacheService.getCalendarEvents();
    if (cached != null && cached.isNotEmpty && !forceRefresh) {
      _events = cached
          .whereType<Map<String, dynamic>>()
          .map((j) => CalendarEvent.fromJson(j))
          .toList();
      _sortEvents();
      notifyListeners();
    } else {
      _isLoading = true;
      notifyListeners();
    }

    try {
      final res = await ApiService.get('/calendar/events');
      if (res is List) {
        _events = res
            .whereType<Map<String, dynamic>>()
            .map((j) => CalendarEvent.fromJson(j))
            .toList();

        _sortEvents();
        await CacheService.saveCalendarEvents(res);
      }
    } catch (e) {
      if (_events.isEmpty) {
        _errorMessage = e.toString();
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void _sortEvents() {
    _events.sort((a, b) => a.startsAt.compareTo(b.startsAt));
  }

  Future<bool> createEvent({
    required String title,
    String? description,
    String? location,
    required DateTime startsAt,
    DateTime? endsAt,
    bool allDay = false,
    String? color,
  }) async {
    try {
      final res = await ApiService.post('/calendar/events', body: {
        'title': title,
        'description': description,
        'location': location,
        'starts_at': startsAt.toIso8601String(),
        'ends_at': endsAt?.toIso8601String(),
        'all_day': allDay,
        'color': color ?? '#3b82f6',
      });
      if (res is Map<String, dynamic>) {
        final newEvent = CalendarEvent.fromJson(res);
        _events.add(newEvent);
        _sortEvents();
        notifyListeners();
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<bool> deleteEvent(int id) async {
    _events.removeWhere((e) => e.id == id);
    notifyListeners();

    try {
      await ApiService.delete('/calendar/events/$id');
      return true;
    } catch (_) {
      return false;
    }
  }
}
