import 'dart:convert';
import 'package:http/http.dart' as http;
import 'cache_service.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final String? url;
  final dynamic rawBody;

  ApiException(this.message, [this.statusCode, this.url, this.rawBody]);

  @override
  String toString() {
    if (statusCode != null) {
      return '$message (HTTP $statusCode)';
    }
    return message;
  }
}

class ApiService {
  static String? _cachedServerUrl;
  static String? _cachedToken;

  static Future<void> init() async {
    _cachedServerUrl = await CacheService.getServerUrl();
    _cachedToken = await CacheService.getAuthToken();
  }

  static void setServerUrl(String url) {
    _cachedServerUrl = url;
  }

  static void setToken(String? token) {
    _cachedToken = token;
  }

  static String get baseUrl {
    return _cachedServerUrl ?? 'https://mail.noirlang.tr';
  }

  static Map<String, String> get _headers {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (_cachedToken != null && _cachedToken!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_cachedToken';
    }
    return headers;
  }

  // 1. GET Request
  static Future<dynamic> get(String path, {Map<String, dynamic>? queryParams}) async {
    var uriString = '$baseUrl/api/v1$path';
    if (queryParams != null && queryParams.isNotEmpty) {
      final query = queryParams.entries
          .map((e) => '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value.toString())}')
          .join('&');
      uriString += '?$query';
    }

    final uri = Uri.parse(uriString);
    try {
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 15));
      return _processResponse(response, uriString);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Bağlantı hatası: ${e.toString()}', null, uriString);
    }
  }

  // 2. POST Request
  static Future<dynamic> post(String path, {dynamic body}) async {
    final uriString = '$baseUrl/api/v1$path';
    final uri = Uri.parse(uriString);
    try {
      final response = await http.post(
        uri,
        headers: _headers,
        body: body != null ? jsonEncode(body) : null,
      ).timeout(const Duration(seconds: 20));
      return _processResponse(response, uriString);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('İstek başarısız: ${e.toString()}', null, uriString);
    }
  }

  // 3. PATCH Request
  static Future<dynamic> patch(String path, {dynamic body}) async {
    final uriString = '$baseUrl/api/v1$path';
    final uri = Uri.parse(uriString);
    try {
      final response = await http.patch(
        uri,
        headers: _headers,
        body: body != null ? jsonEncode(body) : null,
      ).timeout(const Duration(seconds: 15));
      return _processResponse(response, uriString);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Güncelleme başarısız: ${e.toString()}', null, uriString);
    }
  }

  // 4. DELETE Request
  static Future<dynamic> delete(String path, {dynamic body}) async {
    final uriString = '$baseUrl/api/v1$path';
    final uri = Uri.parse(uriString);
    try {
      final response = await http.delete(
        uri,
        headers: _headers,
        body: body != null ? jsonEncode(body) : null,
      ).timeout(const Duration(seconds: 15));
      return _processResponse(response, uriString);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Silme başarısız: ${e.toString()}', null, uriString);
    }
  }

  // Helper response processor
  static dynamic _processResponse(http.Response response, [String? url]) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return {};
      try {
        return jsonDecode(utf8.decode(response.bodyBytes));
      } catch (_) {
        return {'message': response.body};
      }
    } else {
      String errMsg = 'Hata (${response.statusCode})';
      dynamic rawBody;
      try {
        rawBody = jsonDecode(utf8.decode(response.bodyBytes));
        if (rawBody is Map) {
          errMsg = rawBody['error'] ?? rawBody['message'] ?? rawBody['errors']?.toString() ?? errMsg;
        }
      } catch (_) {
        rawBody = response.body;
        if (response.body.isNotEmpty) errMsg = response.body;
      }
      throw ApiException(errMsg, response.statusCode, url, rawBody);
    }
  }
}
