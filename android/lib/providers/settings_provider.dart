import 'package:flutter/material.dart';
import '../models/sender_rule.dart';
import '../services/api_service.dart';

class SettingsProvider extends ChangeNotifier {
  List<SenderRule> _rules = [];
  List<SpeakeasyCode> _speakeasyCodes = [];
  Map<String, dynamic> _settings = {};
  bool _isLoading = false;
  String? _errorMessage;

  List<SenderRule> get rules => _rules;
  List<SpeakeasyCode> get speakeasyCodes => _speakeasyCodes;
  Map<String, dynamic> get settings => _settings;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  List<SenderRule> get approvedRules => _rules.where((r) => r.status == 'approved' || r.status == 'important').toList();
  List<SenderRule> get blockedRules => _rules.where((r) => r.status == 'blocked').toList();
  List<SenderRule> get importantRules => _rules.where((r) => r.status == 'important').toList();

  Future<void> fetchAllSettings() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final resSettings = await ApiService.get('/settings');
      if (resSettings is Map<String, dynamic>) {
        _settings = resSettings;
      }

      final resRules = await ApiService.get('/sender_rules');
      if (resRules is List) {
        _rules = resRules
            .whereType<Map<String, dynamic>>()
            .map((j) => SenderRule.fromJson(j))
            .toList();
      }

      final resCodes = await ApiService.get('/speakeasy_codes');
      if (resCodes is List) {
        _speakeasyCodes = resCodes
            .whereType<Map<String, dynamic>>()
            .map((j) => SpeakeasyCode.fromJson(j))
            .toList();
      }
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // 1. Update settings (Spy pixel, default signature, AI provider)
  Future<bool> updateSettings(Map<String, dynamic> patchData) async {
    try {
      final res = await ApiService.patch('/settings', body: patchData);
      if (res is Map<String, dynamic>) {
        _settings.addAll(patchData);
        notifyListeners();
        return true;
      }
    } catch (_) {}
    return false;
  }

  // 2. Test AI Connection
  Future<Map<String, dynamic>> testAiConnection(String provider, String apiKey) async {
    try {
      final res = await ApiService.post('/settings/ai/test', body: {
        'provider': provider,
        'api_key': apiKey,
      });
      if (res is Map<String, dynamic>) {
        return res;
      }
      return {'success': true, 'message': 'Bağlantı başarılı!'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  // 3. Sender Rule Management
  Future<bool> addOrUpdateRule(String email, String status) async {
    try {
      final res = await ApiService.post('/sender_rules', body: {
        'email_address': email.trim().toLowerCase(),
        'status': status,
      });
      if (res is Map<String, dynamic>) {
        final newRule = SenderRule.fromJson(res);
        _rules.removeWhere((r) => r.emailAddress.toLowerCase() == email.trim().toLowerCase());
        _rules.add(newRule);
        notifyListeners();
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<bool> deleteRule(int id) async {
    _rules.removeWhere((r) => r.id == id);
    notifyListeners();

    try {
      await ApiService.delete('/sender_rules/$id');
      return true;
    } catch (_) {
      return false;
    }
  }

  // 4. Speakeasy Codes Management
  Future<SpeakeasyCode?> createSpeakeasyCode({
    required String label,
    required int durationDays,
    bool singleUse = false,
  }) async {
    try {
      final res = await ApiService.post('/speakeasy_codes', body: {
        'label': label,
        'duration_days': durationDays,
        'single_use': singleUse,
      });
      if (res is Map<String, dynamic>) {
        final code = SpeakeasyCode.fromJson(res);
        _speakeasyCodes.insert(0, code);
        notifyListeners();
        return code;
      }
    } catch (_) {}
    return null;
  }

  Future<bool> deleteSpeakeasyCode(int id) async {
    _speakeasyCodes.removeWhere((c) => c.id == id);
    notifyListeners();

    try {
      await ApiService.delete('/speakeasy_codes/$id');
      return true;
    } catch (_) {
      return false;
    }
  }
}
