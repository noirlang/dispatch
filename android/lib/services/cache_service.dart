import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class CacheService {
  static const String _keyServerUrl = 'dispatch_server_url';
  static const String _keyAuthToken = 'dispatch_auth_token';
  static const String _keyUserData = 'dispatch_user_data';
  static const String _keyServerStatus = 'dispatch_server_status';
  static const String _keyEmailsPrefix = 'dispatch_cached_emails_';
  static const String _keyDashboardCards = 'dispatch_cached_dashboard_cards';
  static const String _keyCalendarEvents = 'dispatch_cached_calendar_events';
  static const String _keyRssFeeds = 'dispatch_cached_rss_feeds';
  static const String _keyRssItems = 'dispatch_cached_rss_items';

  // 1. Server URL & Auth Token
  static Future<void> saveServerUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    // Normalize url
    var normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://$normalized';
    }
    if (normalized.endsWith('/')) {
      normalized = normalized.substring(0, normalized.length - 1);
    }
    await prefs.setString(_keyServerUrl, normalized);
  }

  static Future<String?> getServerUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyServerUrl);
  }

  static Future<void> saveAuthToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyAuthToken, token);
  }

  static Future<String?> getAuthToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyAuthToken);
  }

  static Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyAuthToken);
    await prefs.remove(_keyUserData);
  }

  // 2. User Data
  static Future<void> saveUser(Map<String, dynamic> userJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyUserData, jsonEncode(userJson));
  }

  static Future<Map<String, dynamic>?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_keyUserData);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  // 3. Server Registration Status
  static Future<void> saveServerStatus(Map<String, dynamic> statusJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyServerStatus, jsonEncode(statusJson));
  }

  static Future<Map<String, dynamic>?> getServerStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_keyServerStatus);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  // 4. Emails Offline Cache
  static Future<void> saveEmails(String folder, List<dynamic> emailsJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_keyEmailsPrefix$folder', jsonEncode(emailsJson));
  }

  static Future<List<dynamic>?> getEmails(String folder) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_keyEmailsPrefix$folder');
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as List<dynamic>;
    } catch (_) {
      return null;
    }
  }

  // 5. Dashboard Cards Offline Cache
  static Future<void> saveDashboardCards(List<dynamic> cardsJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyDashboardCards, jsonEncode(cardsJson));
  }

  static Future<List<dynamic>?> getDashboardCards() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_keyDashboardCards);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as List<dynamic>;
    } catch (_) {
      return null;
    }
  }

  // 6. Calendar Events Offline Cache
  static Future<void> saveCalendarEvents(List<dynamic> eventsJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyCalendarEvents, jsonEncode(eventsJson));
  }

  static Future<List<dynamic>?> getCalendarEvents() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_keyCalendarEvents);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as List<dynamic>;
    } catch (_) {
      return null;
    }
  }

  // 7. RSS Feeds & Items Offline Cache
  static Future<void> saveRssFeeds(List<dynamic> feedsJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyRssFeeds, jsonEncode(feedsJson));
  }

  static Future<List<dynamic>?> getRssFeeds() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_keyRssFeeds);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as List<dynamic>;
    } catch (_) {
      return null;
    }
  }

  static Future<void> saveRssItems(List<dynamic> itemsJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyRssItems, jsonEncode(itemsJson));
  }

  static Future<List<dynamic>?> getRssItems() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_keyRssItems);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as List<dynamic>;
    } catch (_) {
      return null;
    }
  }
}
