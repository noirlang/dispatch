import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../services/cache_service.dart';

enum AuthStatus { uninitialized, needsServer, unauthenticated, authenticated }

class AuthProvider extends ChangeNotifier {
  AuthStatus _status = AuthStatus.uninitialized;
  User? _user;
  String? _serverUrl;
  String? _token;
  ServerRegistrationStatus _serverStatus = ServerRegistrationStatus();
  bool _isLoading = false;
  String? _errorMessage;

  AuthStatus get status => _status;
  User? get user => _user;
  String? get serverUrl => _serverUrl;
  String? get token => _token;
  ServerRegistrationStatus get serverStatus => _serverStatus;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  bool get isAuthenticated => _status == AuthStatus.authenticated;

  Future<void> initialize() async {
    _isLoading = true;
    notifyListeners();

    await ApiService.init();
    _serverUrl = await CacheService.getServerUrl();
    _token = await CacheService.getAuthToken();

    final cachedUser = await CacheService.getUser();
    if (cachedUser != null) {
      _user = User.fromJson(cachedUser);
    }

    final cachedStatus = await CacheService.getServerStatus();
    if (cachedStatus != null) {
      _serverStatus = ServerRegistrationStatus.fromJson(cachedStatus);
    }

    if (_serverUrl == null || _serverUrl!.isEmpty) {
      _status = AuthStatus.needsServer;
    } else {
      ApiService.setServerUrl(_serverUrl!);
      if (_token != null && _token!.isNotEmpty) {
        ApiService.setToken(_token);
        _status = AuthStatus.authenticated;
        // Verify and refresh profile in background
        _fetchUserProfile();
      } else {
        _status = AuthStatus.unauthenticated;
        // Fetch server registration capabilities
        checkServerCapabilities(_serverUrl!);
      }
    }

    _isLoading = false;
    notifyListeners();
  }

  // 1. Connect to server
  Future<bool> setServer(String url) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    var normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://$normalized';
    }
    if (normalized.endsWith('/')) {
      normalized = normalized.substring(0, normalized.length - 1);
    }

    try {
      ApiService.setServerUrl(normalized);
      final res = await ApiService.get('/auth/register_mode');
      if (res is Map<String, dynamic>) {
        _serverStatus = ServerRegistrationStatus.fromJson(res);
        await CacheService.saveServerStatus(res);
      }

      await CacheService.saveServerUrl(normalized);
      _serverUrl = normalized;
      _status = AuthStatus.unauthenticated;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      // Fallback check on health or auth endpoint
      try {
        await ApiService.get('/settings');
        await CacheService.saveServerUrl(normalized);
        _serverUrl = normalized;
        _status = AuthStatus.unauthenticated;
        _isLoading = false;
        notifyListeners();
        return true;
      } catch (_) {
        _errorMessage = 'Sunucuya bağlanılamadı. Lütfen adresi kontrol edin.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    }
  }

  // 2. Check Server Capabilities / Registration Mode
  Future<void> checkServerCapabilities(String url) async {
    try {
      final res = await ApiService.get('/auth/register_mode');
      if (res is Map<String, dynamic>) {
        _serverStatus = ServerRegistrationStatus.fromJson(res);
        await CacheService.saveServerStatus(res);
        notifyListeners();
      }
    } catch (_) {}
  }

  // 3. Login
  Future<bool> login(String email, String password, {String? totpCode}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final body = {
        'email': email.trim().toLowerCase(),
        'password': password,
      };
      if (totpCode != null && totpCode.isNotEmpty) {
        body['totp_code'] = totpCode.trim();
      }

      final res = await ApiService.post('/auth/login', body: body);
      if (res is Map<String, dynamic> && res['token'] != null) {
        _token = res['token'];
        ApiService.setToken(_token);
        await CacheService.saveAuthToken(_token!);

        if (res['user'] != null) {
          _user = User.fromJson(res['user']);
          await CacheService.saveUser(_user!.toJson());
        }

        _status = AuthStatus.authenticated;
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        throw ApiException('Geçersiz sunucu yanıtı.');
      }
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // 4. Register
  Future<bool> register({
    required String name,
    required String email,
    required String password,
    String? inviteCode,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final body = {
        'name': name.trim(),
        'email': email.trim().toLowerCase(),
        'password': password,
      };
      if (inviteCode != null && inviteCode.isNotEmpty) {
        body['invite_code'] = inviteCode.trim();
      }

      final res = await ApiService.post('/auth/register', body: body);
      if (res is Map<String, dynamic> && res['token'] != null) {
        _token = res['token'];
        ApiService.setToken(_token);
        await CacheService.saveAuthToken(_token!);

        if (res['user'] != null) {
          _user = User.fromJson(res['user']);
          await CacheService.saveUser(_user!.toJson());
        }

        _status = AuthStatus.authenticated;
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        throw ApiException('Kayıt oluşturulamadı.');
      }
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // 5. Fetch User Profile
  Future<void> _fetchUserProfile() async {
    try {
      final res = await ApiService.get('/auth/me');
      if (res is Map<String, dynamic>) {
        _user = User.fromJson(res);
        await CacheService.saveUser(_user!.toJson());
        notifyListeners();
      }
    } catch (_) {}
  }

  // 6. Logout
  Future<void> logout() async {
    try {
      await ApiService.delete('/auth/logout');
    } catch (_) {}

    await CacheService.clearSession();
    _token = null;
    _user = null;
    ApiService.setToken(null);
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  // 7. Reset server
  Future<void> switchServer() async {
    await logout();
    final prefs = await CacheService.getServerUrl();
    if (prefs != null) {
      final p = await SharedPreferences.getInstance();
      await p.remove('dispatch_server_url');
    }
    _serverUrl = null;
    _status = AuthStatus.needsServer;
    notifyListeners();
  }
}
