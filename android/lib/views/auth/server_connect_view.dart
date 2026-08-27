import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';

class ServerConnectView extends StatefulWidget {
  const ServerConnectView({super.key});

  @override
  State<ServerConnectView> createState() => _ServerConnectViewState();
}

class _ServerConnectViewState extends State<ServerConnectView> {
  final _serverController = TextEditingController(text: 'https://mail.noirlang.tr');
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _serverController.dispose();
    super.dispose();
  }

  Future<void> _handleConnect() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    final success = await auth.setServer(_serverController.text);
    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.errorMessage ?? 'Sunucuya bağlanılamadı!'),
          backgroundColor: AppTheme.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Official Dispatch Logo
                  Center(
                    child: Image.asset(
                      'assets/dispatch.png',
                      height: 48,
                      fit: BoxFit.contain,
                    ),
                  ).animate().fadeIn(duration: 400.ms).scale(begin: const Offset(0.95, 0.95)),

                  const SizedBox(height: 16),
                  const Text(
                    'Bağlanmak istediğiniz Dispatch sunucu adresini girin.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ).animate().fadeIn(delay: 150.ms),

                  const SizedBox(height: 32),

                  // Input Box
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
                        const Text(
                          'SUNUCU ADRESİ',
                          style: TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: _serverController,
                          keyboardType: TextInputType.url,
                          autocorrect: false,
                          style: const TextStyle(
                            color: AppTheme.textPrimary,
                            fontSize: 14,
                            fontFamily: 'monospace',
                          ),
                          decoration: InputDecoration(
                            hintText: 'https://mail.noirlang.tr',
                            prefixIcon: const Icon(LucideIcons.globe, size: 16, color: AppTheme.textMuted),
                            filled: true,
                            fillColor: AppTheme.bgTertiary,
                          ),
                          validator: (val) {
                            if (val == null || val.trim().isEmpty) {
                              return 'Lütfen geçerli bir sunucu adresi girin';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Örnek: https://mail.noirlang.tr veya yerel IP adresiniz.',
                          style: TextStyle(color: AppTheme.textDim, fontSize: 11),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1),

                  const SizedBox(height: 24),

                  // Submit Button
                  ElevatedButton(
                    onPressed: auth.isLoading ? null : _handleConnect,
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
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Sunucuya Bağlan',
                                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                              ),
                              SizedBox(width: 8),
                              Icon(LucideIcons.arrowRight, size: 16),
                            ],
                          ),
                  ).animate().fadeIn(delay: 250.ms),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
