import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
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

  // Login Step State ('email' | 'password')
  String _loginStep = 'email';
  Map<String, dynamic>? _checkedUser;

  // Register Step State ('invite' | 'name' | 'email' | 'password')
  String _registerStep = 'name';

  // Form Controllers
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  final _inviteCodeController = TextEditingController();
  final _totpController = TextEditingController();

  bool _showPassword = false;
  bool _showTotpInput = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    _inviteCodeController.dispose();
    _totpController.dispose();
    super.dispose();
  }

  void _resetForms() {
    _loginStep = 'email';
    _checkedUser = null;
    _registerStep = context.read<AuthProvider>().serverStatus.registrationMode == 'invite_only' ? 'invite' : 'name';
    _emailController.clear();
    _passwordController.clear();
    _nameController.clear();
    _inviteCodeController.clear();
    _totpController.clear();
    _showTotpInput = false;
  }

  // Handle Login Step 1: Check Email
  Future<void> _handleCheckEmail() async {
    final rawUser = _emailController.text.trim().toLowerCase().replaceAll(RegExp(r'^@+'), '');
    if (rawUser.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Lütfen kullanıcı adınızı girin'),
          backgroundColor: AppTheme.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final auth = context.read<AuthProvider>();
    final result = await auth.checkEmail(rawUser);

    if (result != null && (result['exists'] == true || result['exists'] == 'true')) {
      setState(() {
        _checkedUser = result;
        _loginStep = 'password';
      });
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Bu kullanıcı adına ait bir hesap bulunamadı'),
            backgroundColor: AppTheme.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  // Handle Login Step 2: Submit Password
  Future<void> _handleLoginSubmit() async {
    if (_passwordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Lütfen şifrenizi girin'),
          backgroundColor: AppTheme.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final auth = context.read<AuthProvider>();
    final rawUser = _emailController.text.trim().toLowerCase().replaceAll(RegExp(r'^@+'), '');

    final success = await auth.login(
      rawUser,
      _passwordController.text,
      totpCode: _showTotpInput ? _totpController.text : null,
    );

    if (!success && mounted) {
      if (auth.errorMessage?.contains('2FA') == true || auth.errorMessage?.contains('TOTP') == true) {
        setState(() => _showTotpInput = true);
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.errorMessage ?? 'Geçersiz şifre. Lütfen tekrar deneyin.'),
          backgroundColor: AppTheme.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  // Handle Register Steps
  Future<void> _handleRegisterStep() async {
    final auth = context.read<AuthProvider>();
    final regMode = auth.serverStatus.registrationMode;

    if (_registerStep == 'invite') {
      if (_inviteCodeController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Lütfen bir davet kodu girin'),
            backgroundColor: AppTheme.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }
      final valid = await auth.verifyInviteCode(_inviteCodeController.text.trim());
      if (valid) {
        setState(() => _registerStep = 'name');
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Geçersiz veya süresi dolmuş davet kodu!'),
              backgroundColor: AppTheme.red,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
      return;
    }

    if (_registerStep == 'name') {
      if (_nameController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Lütfen adınızı ve soyadınızı girin'),
            backgroundColor: AppTheme.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }
      setState(() => _registerStep = 'email');
      return;
    }

    if (_registerStep == 'email') {
      if (_emailController.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Lütfen bir kullanıcı adı belirleyin'),
            backgroundColor: AppTheme.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }
      setState(() => _registerStep = 'password');
      return;
    }

    if (_registerStep == 'password') {
      if (_passwordController.text.length < 6) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Şifreniz en az 6 karakter olmalıdır'),
            backgroundColor: AppTheme.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }

      final success = await auth.register(
        name: _nameController.text.trim(),
        email: _emailController.text.trim(),
        password: _passwordController.text,
        inviteCode: regMode == 'invite_only' ? _inviteCodeController.text.trim() : null,
      );

      if (!success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(auth.errorMessage ?? 'Kayıt işlemi başarısız oldu!'),
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
    final domain = auth.effectiveDomain;

    final loginSteps = ['email', 'password'];
    final registerSteps = regMode == 'invite_only'
        ? ['invite', 'name', 'email', 'password']
        : ['name', 'email', 'password'];

    final currentStepList = _isLogin ? loginSteps : registerSteps;
    final currentStepIdx = _isLogin
        ? loginSteps.indexOf(_loginStep)
        : registerSteps.indexOf(_registerStep);

    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. Server Connection Pill Badge
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

                const SizedBox(height: 24),

                // 2. Official Dispatch Brand Logo
                Center(
                  child: Image.asset(
                    'assets/dispatch.png',
                    height: 42,
                    fit: BoxFit.contain,
                  ),
                ).animate().fadeIn(duration: 300.ms),

                const SizedBox(height: 20),

                // 3. Step Progress Indicator Dots
                Center(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: currentStepList.map((s) {
                      final idx = currentStepList.indexOf(s);
                      final isActive = idx == currentStepIdx;
                      final isPast = idx < currentStepIdx;

                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        height: 5,
                        width: isActive ? 28 : (isPast ? 14 : 8),
                        decoration: BoxDecoration(
                          color: isActive
                              ? AppTheme.textPrimary
                              : (isPast ? AppTheme.textMuted : AppTheme.borderColor),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      );
                    }).toList(),
                  ),
                ),

                const SizedBox(height: 24),

                // 4. Tab Switcher (Giriş Yap / Kayıt Ol)
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
                          onTap: () {
                            if (!_isLogin) {
                              setState(() {
                                _isLogin = true;
                                _resetForms();
                              });
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 9),
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
                          onTap: () {
                            if (_isLogin) {
                              setState(() {
                                _isLogin = false;
                                _resetForms();
                              });
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 9),
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

                // 5. Error Box if any
                if (auth.errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppTheme.red.withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.circleAlert, size: 16, color: AppTheme.red),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            auth.errorMessage!,
                            style: const TextStyle(
                              color: AppTheme.red,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // 6. MAIN CONTENT BODY
                if (_isLogin) ...[
                  // LOGIN FLOW
                  _buildLoginCard(auth, domain),
                ] else ...[
                  // REGISTER FLOW
                  if (regMode == 'admin_only')
                    _buildAdminOnlyCard()
                  else
                    _buildRegisterCard(auth, domain),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ==================== LOGIN VIEW BUILDER ====================
  Widget _buildLoginCard(AuthProvider auth, String domain) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: AppTheme.bgSecondary,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // If in password step, show User Profile Card
          if (_loginStep == 'password') ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: AppTheme.bgTertiary,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.borderColor),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: AppTheme.bgSecondary,
                    child: Text(
                      _emailController.text.isNotEmpty
                          ? _emailController.text[0].toUpperCase()
                          : 'U',
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _checkedUser?['display_name'] ?? _emailController.text.trim(),
                          style: const TextStyle(
                            color: AppTheme.textPrimary,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          '${_emailController.text.trim().replaceAll(RegExp(r'^@+'), '')}@$domain',
                          style: const TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 11,
                            fontFamily: 'monospace',
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _loginStep = 'email';
                        _passwordController.clear();
                      });
                    },
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text(
                      'Farklı hesap',
                      style: TextStyle(
                        color: AppTheme.blue,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],

          // Title & Description
          Text(
            _loginStep == 'email' ? 'Kullanıcı adınız nedir?' : 'Şifrenizi girin',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 19,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            _loginStep == 'email'
                ? 'Devam etmek için kullanıcı adınızı yazın.'
                : 'Hesabınıza erişmek için şifrenizi girin.',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppTheme.textMuted,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 22),

          // Input Box
          if (_loginStep == 'email') ...[
            TextFormField(
              controller: _emailController,
              keyboardType: TextInputType.text,
              autocorrect: false,
              enableSuggestions: false,
              textCapitalization: TextCapitalization.none,
              autofocus: true,
              onFieldSubmitted: (_) => _handleCheckEmail(),
              style: const TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 14,
                fontFamily: 'monospace',
              ),
              decoration: InputDecoration(
                hintText: 'kullanici_adi',
                prefixIcon: const Icon(LucideIcons.user, size: 16, color: AppTheme.textMuted),
                suffixIcon: Padding(
                  padding: const EdgeInsets.only(right: 8, top: 8, bottom: 8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.bgTertiary,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppTheme.borderColor),
                    ),
                    child: Text(
                      '@$domain',
                      style: const TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 11,
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: auth.isLoading ? null : _handleCheckEmail,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accent,
                foregroundColor: AppTheme.bgPrimary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: auth.isLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.bgPrimary),
                    )
                  : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('İlerle', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        SizedBox(width: 6),
                        Icon(LucideIcons.arrowRight, size: 16),
                      ],
                    ),
            ),
          ] else ...[
            // Password Step
            TextFormField(
              controller: _passwordController,
              obscureText: !_showPassword,
              autocorrect: false,
              enableSuggestions: false,
              textCapitalization: TextCapitalization.none,
              autofocus: true,
              onFieldSubmitted: (_) => _handleLoginSubmit(),
              style: const TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 14,
                letterSpacing: 2,
              ),
              decoration: InputDecoration(
                hintText: '••••••••',
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
            ),

            if (_showTotpInput) ...[
              const SizedBox(height: 14),
              TextFormField(
                controller: _totpController,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16, letterSpacing: 4),
                decoration: const InputDecoration(
                  hintText: '123456',
                  prefixIcon: Icon(LucideIcons.shieldCheck, size: 16, color: AppTheme.blue),
                ),
              ),
            ],

            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: auth.isLoading ? null : _handleLoginSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accent,
                foregroundColor: AppTheme.bgPrimary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: auth.isLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.bgPrimary),
                    )
                  : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Giriş Yap', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        SizedBox(width: 6),
                        Icon(LucideIcons.arrowRight, size: 16),
                      ],
                    ),
            ),
          ],
        ],
      ),
    );
  }

  // ==================== REGISTER VIEW BUILDER ====================
  Widget _buildRegisterCard(AuthProvider auth, String domain) {
    String stepTitle = 'Kayıt Olun';
    String stepDesc = 'Bilgilerinizi doldurun.';

    if (_registerStep == 'invite') {
      stepTitle = 'Davet Kodunuzu Girin';
      stepDesc = 'Bu sunucuya katılmak için davet kodu gereklidir.';
    } else if (_registerStep == 'name') {
      stepTitle = 'Adınız ve Soyadınız?';
      stepDesc = 'E-postalarda görünecek görünen adınız.';
    } else if (_registerStep == 'email') {
      stepTitle = 'Kullanıcı Adınızı Belirleyin';
      stepDesc = 'Kişisel e-posta adresinizi seçin.';
    } else if (_registerStep == 'password') {
      stepTitle = 'Güçlü Bir Şifre Oluşturun';
      stepDesc = 'Hesabınızı güvende tutmak için en az 6 karakter girin.';
    }

    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: AppTheme.bgSecondary,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            stepTitle,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 19,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            stepDesc,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppTheme.textMuted,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 22),

          if (_registerStep == 'invite') ...[
            TextFormField(
              controller: _inviteCodeController,
              autofocus: true,
              style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontFamily: 'monospace'),
              decoration: const InputDecoration(
                hintText: 'INV-XXXXXXXX',
                prefixIcon: Icon(LucideIcons.ticket, size: 16, color: AppTheme.amber),
              ),
            ),
          ] else if (_registerStep == 'name') ...[
            TextFormField(
              controller: _nameController,
              autofocus: true,
              style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
              decoration: const InputDecoration(
                hintText: 'Ad Soyad',
                prefixIcon: Icon(LucideIcons.user, size: 16, color: AppTheme.textMuted),
              ),
            ),
          ] else if (_registerStep == 'email') ...[
            TextFormField(
              controller: _emailController,
              autofocus: true,
              autocorrect: false,
              enableSuggestions: false,
              textCapitalization: TextCapitalization.none,
              style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontFamily: 'monospace'),
              decoration: InputDecoration(
                hintText: 'kullanici_adi',
                prefixIcon: const Icon(LucideIcons.mail, size: 16, color: AppTheme.textMuted),
                suffixIcon: Padding(
                  padding: const EdgeInsets.only(right: 8, top: 8, bottom: 8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.bgTertiary,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppTheme.borderColor),
                    ),
                    child: Text(
                      '@$domain',
                      style: const TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 11,
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ] else if (_registerStep == 'password') ...[
            TextFormField(
              controller: _passwordController,
              autofocus: true,
              obscureText: !_showPassword,
              autocorrect: false,
              enableSuggestions: false,
              textCapitalization: TextCapitalization.none,
              style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
              decoration: InputDecoration(
                hintText: '••••••••',
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
            ),
          ],

          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: auth.isLoading ? null : _handleRegisterStep,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.accent,
              foregroundColor: AppTheme.bgPrimary,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: auth.isLoading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.bgPrimary),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _registerStep == 'password' ? 'Hesap Oluştur' : 'İlerle',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(width: 6),
                      const Icon(LucideIcons.arrowRight, size: 16),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  // ==================== ADMIN ONLY VIEW BUILDER ====================
  Widget _buildAdminOnlyCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.bgSecondary,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.amber.withOpacity(0.12),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.amber.withOpacity(0.3)),
            ),
            child: const Icon(LucideIcons.shieldAlert, size: 28, color: AppTheme.amber),
          ),
          const SizedBox(height: 16),
          const Text(
            'Açık Kayıtlar Kapalıdır',
            style: TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 17,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Bu sunucuda doğrudan hesap oluşturma kapalıdır. Yeni bir e-posta hesabı açmak için lütfen sistem yöneticinizle iletişime geçin.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppTheme.textMuted,
              fontSize: 12,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () => setState(() => _isLogin = true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.accent,
              foregroundColor: AppTheme.bgPrimary,
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Giriş Yap Sayfasına Git', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          ),
        ],
      ),
    );
  }
}
