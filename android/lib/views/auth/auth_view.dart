import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';

class AuthView extends StatefulWidget {
  const AuthView({super.key});

  @override
  State<AuthView> createState() => _AuthViewState();
}

class _AuthViewState extends State<AuthView> {
  bool _isLogin = true;

  // Form Controllers
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  final _inviteCodeController = TextEditingController();
  final _totpController = TextEditingController();

  bool _showPassword = false;
  bool _showTotpInput = false;

  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    _inviteCodeController.dispose();
    _totpController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();

    if (_isLogin) {
      final success = await auth.login(
        _emailController.text,
        _passwordController.text,
        totpCode: _showTotpInput ? _totpController.text : null,
      );
      if (!success && mounted) {
        if (auth.errorMessage?.contains('2FA') == true || auth.errorMessage?.contains('TOTP') == true) {
          setState(() => _showTotpInput = true);
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(auth.errorMessage ?? 'Giriş yapılamadı!'),
            backgroundColor: AppTheme.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } else {
      final success = await auth.register(
        name: _nameController.text,
        email: _emailController.text,
        password: _passwordController.text,
        inviteCode: _inviteCodeController.text.isNotEmpty ? _inviteCodeController.text : null,
      );
      if (!success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(auth.errorMessage ?? 'Kayıt yapılamadı!'),
            backgroundColor: AppTheme.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final regMode = auth.serverStatus.registrationMode;

    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Server connection banner
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.bgSecondary,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.borderColor),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: AppTheme.green,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            auth.serverUrl?.replaceAll('https://', '').replaceAll('http://', '') ?? 'dispatch.local',
                            style: const TextStyle(
                              color: AppTheme.textSecondary,
                              fontSize: 12,
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 8),
                          InkWell(
                            onTap: () => auth.switchServer(),
                            child: const Text(
                              'Değiştir',
                              style: TextStyle(
                                color: AppTheme.blue,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 28),

                  // Header title
                  Text(
                    _isLogin ? 'Hesabınıza Giriş Yapın' : 'Yeni Hesap Oluşturun',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _isLogin
                        ? 'Dispatch e-posta kutunuza erişin.'
                        : 'Kişisel, güvenli ve yapay zeka destekli e-posta adresiniz.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 13,
                    ),
                  ),

                  const SizedBox(height: 28),

                  // Tab switcher (Giriş / Kayıt)
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: AppTheme.bgSecondary,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.borderColor),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _isLogin = true),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: _isLogin ? AppTheme.bgTertiary : Colors.transparent,
                                borderRadius: BorderRadius.circular(12),
                                border: _isLogin
                                    ? Border.all(color: AppTheme.borderLight, width: 1)
                                    : null,
                              ),
                              child: Text(
                                'Giriş Yap',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: _isLogin ? AppTheme.textPrimary : AppTheme.textMuted,
                                  fontSize: 13,
                                  fontWeight: _isLogin ? FontWeight.bold : FontWeight.w500,
                                ),
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _isLogin = false),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: !_isLogin ? AppTheme.bgTertiary : Colors.transparent,
                                borderRadius: BorderRadius.circular(12),
                                border: !_isLogin
                                    ? Border.all(color: AppTheme.borderLight, width: 1)
                                    : null,
                              ),
                              child: Text(
                                'Kayıt Ol',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: !_isLogin ? AppTheme.textPrimary : AppTheme.textMuted,
                                  fontSize: 13,
                                  fontWeight: !_isLogin ? FontWeight.bold : FontWeight.w500,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Main Form Fields
                  if (!_isLogin && regMode == 'admin_only') ...[
                    // Admin only banner
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppTheme.bgSecondary,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.borderColor),
                      ),
                      child: const Column(
                        children: [
                          Icon(LucideIcons.lock, size: 36, color: AppTheme.amber),
                          SizedBox(height: 12),
                          Text(
                            'Kayıtlar Kapalı',
                            style: TextStyle(
                              color: AppTheme.textPrimary,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          SizedBox(height: 6),
                          Text(
                            'Bu sunucuda herkese açık kayıtlar devre dışı bırakılmıştır. Yeni hesaplar yalnızca Sistem Yöneticisi tarafından açılabilir.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: AppTheme.textMuted,
                              fontSize: 12,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppTheme.bgSecondary,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.borderColor),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (!_isLogin) ...[
                            // Name input
                            const Text('AD & SOYAD', style: _labelStyle),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: _nameController,
                              style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
                              decoration: const InputDecoration(
                                hintText: 'Adınız Soyadınız',
                                prefixIcon: Icon(LucideIcons.user, size: 16, color: AppTheme.textMuted),
                              ),
                              validator: (val) {
                                if (!_isLogin && (val == null || val.trim().isEmpty)) {
                                  return 'Lütfen adınızı girin';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),

                            // Invite Code input if invite_only
                            if (regMode == 'invite_only') ...[
                              const Text('DAVET KODU', style: _labelStyle),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _inviteCodeController,
                                style: const TextStyle(
                                  color: AppTheme.textPrimary,
                                  fontSize: 14,
                                  fontFamily: 'monospace',
                                ),
                                decoration: const InputDecoration(
                                  hintText: 'DSP-XXXX-XXXX',
                                  prefixIcon: Icon(LucideIcons.ticket, size: 16, color: AppTheme.amber),
                                ),
                                validator: (val) {
                                  if (!_isLogin && regMode == 'invite_only' && (val == null || val.trim().isEmpty)) {
                                    return 'Bu sunucu için geçerli bir davet kodu gereklidir';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16),
                            ],
                          ],

                          // Email Input
                          const Text('E-POSTA ADRESİ', style: _labelStyle),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            autocorrect: false,
                            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
                            decoration: InputDecoration(
                              hintText: 'kullanici@${auth.serverStatus.domain ?? "domain.com"}',
                              prefixIcon: const Icon(LucideIcons.mail, size: 16, color: AppTheme.textMuted),
                            ),
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) {
                                return 'Lütfen e-posta adresinizi girin';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          // Password Input
                          const Text('ŞİFRE', style: _labelStyle),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _passwordController,
                            obscureText: !_showPassword,
                            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
                            decoration: InputDecoration(
                              hintText: '••••••••••••',
                              prefixIcon: const Icon(LucideIcons.key, size: 16, color: AppTheme.textMuted),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _showPassword ? LucideIcons.eyeOff : LucideIcons.eye,
                                  size: 16,
                                  color: AppTheme.textMuted,
                                ),
                                onPressed: () => setState(() => _showPassword = !_showPassword),
                              ),
                            ),
                            validator: (val) {
                              if (val == null || val.trim().length < 6) {
                                return 'Şifreniz en az 6 karakter olmalıdır';
                              }
                              return null;
                            },
                          ),

                          // Optional 2FA Code Input
                          if (_isLogin && _showTotpInput) ...[
                            const SizedBox(height: 16),
                            const Text('2FA DOĞRULAMA KODU (TOTP)', style: _labelStyle),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: _totpController,
                              keyboardType: TextInputType.number,
                              style: const TextStyle(
                                color: AppTheme.textPrimary,
                                fontSize: 16,
                                letterSpacing: 4,
                                fontFamily: 'monospace',
                              ),
                              decoration: const InputDecoration(
                                hintText: '123456',
                                prefixIcon: Icon(LucideIcons.shieldCheck, size: 16, color: AppTheme.blue),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Submit Button
                    ElevatedButton(
                      onPressed: auth.isLoading ? null : _handleSubmit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.accent,
                        foregroundColor: AppTheme.accentInvert,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: auth.isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppTheme.accentInvert,
                              ),
                            )
                          : Text(
                              _isLogin ? 'Giriş Yap' : 'Hesabı Oluştur',
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                            ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  static const TextStyle _labelStyle = TextStyle(
    color: AppTheme.textMuted,
    fontSize: 11,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  );
}
