import 'package:flutter/material.dart';
import '../models/dashboard_card.dart';
import '../services/api_service.dart';
import '../services/cache_service.dart';

class DashboardProvider extends ChangeNotifier {
  List<DashboardCard> _cards = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<DashboardCard> get cards => _cards;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchDashboardCards({bool forceRefresh = false}) async {
    _errorMessage = null;

    final cached = await CacheService.getDashboardCards();
    if (cached != null && cached.isNotEmpty && !forceRefresh) {
      _cards = cached
          .whereType<Map<String, dynamic>>()
          .map((j) => DashboardCard.fromJson(j))
          .toList();
      _sortCards();
      notifyListeners();
    } else {
      _isLoading = true;
      notifyListeners();
    }

    try {
      final res = await ApiService.get('/dashboard');
      if (res is List) {
        _cards = res
            .whereType<Map<String, dynamic>>()
            .map((j) => DashboardCard.fromJson(j))
            .toList();

        _sortCards();
        await CacheService.saveDashboardCards(res);
      }
    } catch (e) {
      if (_cards.isEmpty) {
        _errorMessage = e.toString();
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void _sortCards() {
    _cards.sort((a, b) {
      final weightComp = a.priorityWeight.compareTo(b.priorityWeight);
      if (weightComp != 0) return weightComp;
      return b.createdAt.compareTo(a.createdAt);
    });
  }

  Future<bool> dismissCard(int id) async {
    _cards.removeWhere((c) => c.id == id);
    notifyListeners();

    try {
      await ApiService.delete('/dashboard/$id');
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> addToCalendar(int id) async {
    try {
      await ApiService.post('/dashboard/$id/add_to_calendar');
      return true;
    } catch (_) {
      return false;
    }
  }
}
