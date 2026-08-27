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

    var input = url.trim();
    if (input.endsWith('/')) {
      input = input.substring(0, input.length - 1);
    }

    // Prepare URL candidates: if protocol provided, use as-is; otherwise try https then http
    List<String> candidates = [];
    if (input.startsWith('http://') || input.startsWith('https://')) {
      candidates.add(input);
    } else {
      candidates.add('https://$input');
      candidates.add('http://$input');
    }

    for (final candidate in candidates) {
      try {
        ApiService.setServerUrl(candidate);
        final res = await ApiService.get('/auth/registration_status');
        if (res is Map<String, dynamic>) {
          _serverStatus = ServerRegistrationStatus.fromJson(res);
          await CacheService.saveServerStatus(res);
        }

        await CacheService.saveServerUrl(candidate);
        _serverUrl = candidate;
        _status = AuthStatus.unauthenticated;
        _isLoading = false;
        notifyListeners();
        return true;
      } catch (e) {
        // Continue to next candidate if available
        continue;
      }
    }

    // Try fallback endpoint /settings
    for (final candidate in candidates) {
      try {
        ApiService.setServerUrl(candidate);
        await ApiService.get('/settings');
        await CacheService.saveServerUrl(candidate);
        _serverUrl = candidate;
        _status = AuthStatus.unauthenticated;
        _isLoading = false;
        notifyListeners();
        return true;
      } catch (_) {
        continue;
      }
    }

    _errorMessage = 'Sunucuya bağlanılamadı. Lütfen sunucu adresini ve internet bağlantınızı kontrol edin.';
    _isLoading = false;
    notifyListeners();
    return false;
  }

  // 2. Check Server Capabilities / Registration Mode
  Future<void> checkServerCapabilities(String url) async {
    try {
      final res = await ApiService.get('/auth/registration_status');
      if (res is Map<String, dynamic>) {
        _serverStatus = ServerRegistrationStatus.fromJson(res);
        await CacheService.saveServerStatus(res);
        notifyListeners();
      }
    } catch (_) {}
  }

  String get effectiveDomain {
    if (_serverStatus.domain != null && _serverStatus.domain!.isNotEmpty) {
      return _serverStatus.domain!;
    }
    if (_serverUrl != null && _serverUrl!.isNotEmpty) {
      try {
        final uri = Uri.parse(_serverUrl!);
        String host = uri.host;
        if (host.startsWith('mail.')) {
          host = host.substring(5);
        } else if (host.startsWith('api.')) {
          host = host.substring(4);
        }
        if (host.isNotEmpty) return host;
      } catch (_) {}
    }
    return 'noirlang.tr';
  }

  String normalizeEmail(String input) {
    var clean = input.trim().toLowerCase().replaceAll(RegExp(r'^@+'), '');
    if (clean.contains('@')) {
      return clean;
    }
    return '$clean@$effectiveDomain';
  }

  // 3. Login
  Future<bool> login(String email, String password, {String? totpCode}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final rawInput = email.trim().toLowerCase().replaceAll(RegExp(r'^@+'), '');
    final uname = rawInput.split('@').first;

    final Set<String> candidates = {
      rawInput,
      uname,
      if (_serverStatus.domain != null && _serverStatus.domain!.isNotEmpty)
        '$uname@${_serverStatus.domain}',
      '$uname@$effectiveDomain',
      '$uname@dispatch.local',
    };

    String lastError = 'Geçersiz kullanıcı adı veya şifre';

    for (final candidate in candidates) {
      if (candidate.isEmpty) continue;
      try {
        ApiService.setToken(null);
        final body = {
          'email': candidate,
          'username': uname,
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
        }
      } catch (e) {
        lastError = e.toString();
        // If 2FA is required, don't keep looping with wrong candidates
        if (lastError.contains('2FA') || lastError.contains('TOTP')) {
          break;
        }
      }
    }

    _errorMessage = lastError;
    _isLoading = false;
    notifyListeners();
    return false;
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
      final cleanEmail = normalizeEmail(email);
      final rawUname = email.trim().toLowerCase().replaceAll(RegExp(r'^@+'), '').split('@').first;
      final body = {
        'name': name.trim(),
        'email': cleanEmail,
        'username': rawUname,
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
