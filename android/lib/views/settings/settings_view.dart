import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/settings_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/sender_avatar.dart';

class SettingsView extends StatefulWidget {
  const SettingsView({super.key});

  @override
  State<SettingsView> createState() => _SettingsViewState();
}

class _SettingsViewState extends State<SettingsView> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SettingsProvider>().fetchAllSettings();
    });
  }

  // 1. AI API Key Configuration Modal
  void _showAiSettingsModal(BuildContext context) {
    final settings = context.read<SettingsProvider>();
    final geminiKeyController = TextEditingController(text: settings.settings['gemini_api_key'] ?? '');
    final claudeKeyController = TextEditingController(text: settings.settings['claude_api_key'] ?? '');
    final openaiKeyController = TextEditingController(text: settings.settings['openai_api_key'] ?? '');
    String activeProvider = settings.settings['active_ai_provider'] ?? 'gemini';
    bool isTesting = false;
    String? testResult;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.bgSecondary,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(LucideIcons.sparkles, color: AppTheme.blue, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Yapay Zeka Entegrasyonu',
                          style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(LucideIcons.x, size: 18),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'Kendi API anahtarlarınızı girerek e-posta özeti, akıllı yanıt ve çeviri özelliklerini aktifleştirin.',
                  style: TextStyle(color: AppTheme.textMuted, fontSize: 12, height: 1.3),
                ),
                const SizedBox(height: 16),

                // Gemini API Key
                const Text('GOOGLE GEMINI API KEY', style: _settingLabelStyle),
                const SizedBox(height: 6),
                TextField(
                  controller: geminiKeyController,
                  obscureText: true,
                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontFamily: 'monospace'),
                  decoration: const InputDecoration(hintText: 'AIzaSy...'),
                ),
                const SizedBox(height: 14),

                // Claude API Key
                const Text('ANTHROPIC CLAUDE API KEY', style: _settingLabelStyle),
                const SizedBox(height: 6),
                TextField(
                  controller: claudeKeyController,
                  obscureText: true,
                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontFamily: 'monospace'),
                  decoration: const InputDecoration(hintText: 'sk-ant-...'),
                ),
                const SizedBox(height: 14),

                // OpenAI API Key
                const Text('OPENAI API KEY', style: _settingLabelStyle),
                const SizedBox(height: 6),
                TextField(
                  controller: openaiKeyController,
                  obscureText: true,
                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontFamily: 'monospace'),
                  decoration: const InputDecoration(hintText: 'sk-proj-...'),
                ),
                const SizedBox(height: 16),

                // Active Provider Selection
                const Text('AKTİF YAPAY ZEKA SAĞLAYICISI', style: _settingLabelStyle),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _buildAiProviderChip('Gemini', 'gemini', activeProvider, (p) => setModalState(() => activeProvider = p)),
                    const SizedBox(width: 8),
                    _buildAiProviderChip('Claude', 'claude', activeProvider, (p) => setModalState(() => activeProvider = p)),
                    const SizedBox(width: 8),
                    _buildAiProviderChip('OpenAI', 'openai', activeProvider, (p) => setModalState(() => activeProvider = p)),
                  ],
                ),

                if (testResult != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    testResult!,
                    style: TextStyle(
                      color: testResult!.contains('başarılı') ? AppTheme.green : AppTheme.red,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],

                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: isTesting
                            ? null
                            : () async {
                                setModalState(() {
                                  isTesting = true;
                                  testResult = null;
                                });
                                String key = geminiKeyController.text;
                                if (activeProvider == 'claude') key = claudeKeyController.text;
                                if (activeProvider == 'openai') key = openaiKeyController.text;

                                final res = await context.read<SettingsProvider>().testAiConnection(activeProvider, key);
                                setModalState(() {
                                  isTesting = false;
                                  testResult = res['success'] == true ? 'Bağlantı başarılı!' : 'Hata: ${res['error']}';
                                });
                              },
                        child: Text(isTesting ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.accent,
                          foregroundColor: AppTheme.accentInvert,
                        ),
                        onPressed: () async {
                          await context.read<SettingsProvider>().updateSettings({
                            'gemini_api_key': geminiKeyController.text.trim(),
                            'claude_api_key': claudeKeyController.text.trim(),
                            'openai_api_key': openaiKeyController.text.trim(),
                            'active_ai_provider': activeProvider,
                          });
                          if (ctx.mounted) Navigator.pop(ctx);
                        },
                        child: const Text('Kaydet', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAiProviderChip(String label, String value, String current, Function(String) onSelect) {
    final isSelected = value == current;
    return InkWell(
      onTap: () => onSelect(value),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.bgTertiary : AppTheme.bgPrimary,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isSelected ? AppTheme.blue : AppTheme.borderColor),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? AppTheme.blue : AppTheme.textMuted,
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  // 1b. Signature Settings Modal
  void _showSignatureModal(BuildContext context) {
    final settings = context.read<SettingsProvider>();
    final auth = context.read<AuthProvider>();
    final currentSig = settings.settings['default_signature'] ?? auth.user?.defaultSignature ?? '';
    final sigController = TextEditingController(text: currentSig);
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.bgSecondary,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(LucideIcons.fileSignature, color: AppTheme.blue, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Varsayılan E-posta İmzası',
                          style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(LucideIcons.x, size: 18),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Web ve mobilde gönderdiğiniz tüm yeni e-postaların ve yanıtların altına otomatik olarak eklenir.',
                  style: TextStyle(color: AppTheme.textMuted, fontSize: 12, height: 1.3),
                ),
                const SizedBox(height: 16),
                const Text('İMZA METNİ', style: _settingLabelStyle),
                const SizedBox(height: 6),
                TextField(
                  controller: sigController,
                  maxLines: 4,
                  minLines: 3,
                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, height: 1.5),
                  decoration: const InputDecoration(
                    hintText: 'Saygılarımla,\nAdınız Soyadınız\nŞirket / Unvan',
                  ),
                  onChanged: (_) => setModalState(() {}),
                ),
                const SizedBox(height: 14),
                if (sigController.text.trim().isNotEmpty) ...[
                  const Text('ÖNİZLEME', style: _settingLabelStyle),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.bgPrimary,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.borderColor),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('--', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                        const SizedBox(height: 4),
                        Text(
                          sigController.text.trim(),
                          style: const TextStyle(color: AppTheme.textPrimary, fontSize: 12, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.blue,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: isSaving
                      ? null
                      : () async {
                          setModalState(() => isSaving = true);
                          final navigator = Navigator.of(ctx);
                          final messenger = ScaffoldMessenger.of(context);
                          final newSig = sigController.text.trim();
                          final success = await settings.updateSettings({'default_signature': newSig});
                          if (ctx.mounted) {
                            navigator.pop();
                            messenger.showSnackBar(
                              SnackBar(
                                content: Text(success ? 'E-posta imzası kaydedildi' : 'İmza kaydedilemedi'),
                                duration: const Duration(seconds: 2),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          }
                        },
                  child: isSaving
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('İmzayı Kaydet', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // 2. Speakeasy Codes Modal
  void _showSpeakeasyModal(BuildContext context) {
    final labelController = TextEditingController();
    int selectedDays = 7;
    bool singleUse = false;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.bgSecondary,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Consumer<SettingsProvider>(
        builder: (ctx, settings, _) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(LucideIcons.key, color: AppTheme.amber, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Speakeasy Giriş Kodları',
                          style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(LucideIcons.x, size: 18),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'Bu kodları e-posta atmasını istediğiniz kişilere verebilirsiniz. Gönderdikleri e-postada bu kod yer alırsa doğrudan Gelen Kutusu\'na kabul edilir.',
                  style: TextStyle(color: AppTheme.textMuted, fontSize: 12, height: 1.3),
                ),
                const SizedBox(height: 16),

                // Active codes list
                if (settings.speakeasyCodes.isNotEmpty) ...[
                  const Text('AKTİF KODLAR', style: _settingLabelStyle),
                  const SizedBox(height: 8),
                  ...settings.speakeasyCodes.map((code) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.bgTertiary,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.borderColor),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  code.code,
                                  style: const TextStyle(
                                    color: AppTheme.amber,
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    fontFamily: 'monospace',
                                  ),
                                ),
                                if (code.label != null)
                                  Text(code.label!, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(LucideIcons.copy, size: 14, color: AppTheme.textMuted),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: code.code));
                              ScaffoldMessenger.of(ctx).showSnackBar(
                                const SnackBar(content: Text('Kod kopyalandı!'), duration: Duration(seconds: 1)),
                              );
                            },
                          ),
                          IconButton(
                            icon: const Icon(LucideIcons.trash2, size: 14, color: AppTheme.red),
                            onPressed: () => settings.deleteSpeakeasyCode(code.id),
                          ),
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: 16),
                ],

                // Create new code form
                const Text('YENİ KOD OLUŞTUR', style: _settingLabelStyle),
                const SizedBox(height: 8),
                TextField(
                  controller: labelController,
                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13),
                  decoration: const InputDecoration(labelText: 'Etiket / Not', hintText: 'Örn: Freelance Müşteri'),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.amber,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onPressed: () async {
                    await settings.createSpeakeasyCode(
                      label: labelController.text.trim(),
                      durationDays: selectedDays,
                      singleUse: singleUse,
                    );
                    labelController.clear();
                  },
                  child: const Text('Yeni Speakeasy Kodu Üret', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // 3. Sender Rules Modal
  void _showSenderRulesModal(BuildContext context) {
    final emailController = TextEditingController();
    String selectedStatus = 'approved';

    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.bgSecondary,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Consumer<SettingsProvider>(
        builder: (ctx, settings, _) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(LucideIcons.users, color: AppTheme.green, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Kişi & Gönderici Kuralları',
                          style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(LucideIcons.x, size: 18),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Rules list
                if (settings.rules.isNotEmpty) ...[
                  ...settings.rules.map((rule) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppTheme.bgTertiary,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.borderColor),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              rule.emailAddress,
                              style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w500),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: rule.status == 'approved'
                                  ? AppTheme.green.withOpacity(0.15)
                                  : rule.status == 'important'
                                      ? AppTheme.amber.withOpacity(0.15)
                                      : AppTheme.red.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              rule.status == 'approved'
                                  ? 'Onaylı'
                                  : rule.status == 'important'
                                      ? 'Önemli'
                                      : 'Engelli',
                              style: TextStyle(
                                color: rule.status == 'approved'
                                    ? AppTheme.green
                                    : rule.status == 'important'
                                        ? AppTheme.amber
                                        : AppTheme.red,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(LucideIcons.trash2, size: 14, color: AppTheme.red),
                            onPressed: () => settings.deleteRule(rule.id),
                          ),
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: 16),
                ],

                // Add new rule
                const Text('YENİ KURAL EKLE', style: _settingLabelStyle),
                const SizedBox(height: 8),
                TextField(
                  controller: emailController,
                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13),
                  decoration: const InputDecoration(hintText: 'ornek@domain.com veya @sirket.com'),
                ),
                const SizedBox(height: 14),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.accent,
                    foregroundColor: AppTheme.accentInvert,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onPressed: () async {
                    if (emailController.text.trim().isEmpty) return;
                    await settings.addOrUpdateRule(emailController.text.trim(), selectedStatus);
                    emailController.clear();
                  },
                  child: const Text('Kuralı Kaydet', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final settings = context.watch<SettingsProvider>();
    final user = auth.user;

    final spyPixelEnabled = settings.settings['spy_pixel_blocking'] ?? true;
    final approvalEnabled = settings.settings['approval_system_enabled'] ?? true;

    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      appBar: AppBar(
        title: const Text('Ayarlar'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // User Profile Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.bgSecondary,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.borderColor),
              ),
              child: Row(
                children: [
                  SenderAvatar(
                    avatarUrl: user?.avatarPath,
                    initials: (user?.name != null && user!.name!.isNotEmpty)
                        ? user.name!.substring(0, user.name!.length >= 2 ? 2 : 1).toUpperCase()
                        : (user?.email != null && user!.email.isNotEmpty ? user.email.substring(0, 1).toUpperCase() : 'D'),
                    identifier: user?.email ?? '',
                    size: 52,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          (user?.name != null && user!.name!.isNotEmpty)
                              ? user.name!
                              : (user?.email != null && user!.email.isNotEmpty ? user.email.split('@').first : 'Dispatch Kullanıcısı'),
                          style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          user?.email ?? '',
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 12, fontFamily: 'monospace'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Settings Sections
            _buildSectionHeader('GÜVENLİK & GİZLİLİK'),
            _buildSettingTile(
              icon: LucideIcons.shieldCheck,
              iconColor: AppTheme.green,
              title: 'Spy Pixel Koruması',
              subtitle: 'Görseller sunucu proxy\'si üzerinden yüklenir, IP gizlenir',
              trailing: Switch(
                value: spyPixelEnabled,
                activeColor: AppTheme.green,
                onChanged: (val) {
                  settings.updateSettings({'spy_pixel_blocking': val});
                },
              ),
            ),
            _buildSettingTile(
              icon: LucideIcons.userCheck,
              iconColor: AppTheme.blue,
              title: 'Onay Sistemi (Approvals)',
              subtitle: 'İlk kez yazan göndericiler onay kuyruğuna düşer',
              trailing: Switch(
                value: approvalEnabled,
                activeColor: AppTheme.blue,
                onChanged: (val) {
                  settings.updateSettings({'approval_system_enabled': val});
                },
              ),
            ),
            _buildSettingTile(
              icon: LucideIcons.users,
              iconColor: AppTheme.green,
              title: 'Kişi & Gönderici Kuralları',
              subtitle: 'Onaylı, önemli ve engelli adresleri yönetin',
              onTap: () => _showSenderRulesModal(context),
            ),
            _buildSettingTile(
              icon: LucideIcons.key,
              iconColor: AppTheme.amber,
              title: 'Speakeasy Giriş Kodları',
              subtitle: 'Zamanlı özel e-posta geçiş kodları oluşturun',
              onTap: () => _showSpeakeasyModal(context),
            ),

            const SizedBox(height: 20),
            _buildSectionHeader('E-POSTA AYARLARI'),
            _buildSettingTile(
              icon: LucideIcons.fileSignature,
              iconColor: AppTheme.blue,
              title: 'Varsayılan E-posta İmzası',
              subtitle: (settings.settings['default_signature']?.toString().trim().isNotEmpty == true)
                  ? settings.settings['default_signature'].toString().trim().replaceAll('\n', ' · ')
                  : ((user?.defaultSignature?.trim().isNotEmpty == true)
                      ? user!.defaultSignature!.trim().replaceAll('\n', ' · ')
                      : 'Henüz imza ayarlanmadı (Dokunarak düzenleyin)'),
              onTap: () => _showSignatureModal(context),
            ),

            const SizedBox(height: 20),
            _buildSectionHeader('YAPAY ZEKA (AI)'),
            _buildSettingTile(
              icon: LucideIcons.sparkles,
              iconColor: AppTheme.purple,
              title: 'Yapay Zeka Sağlayıcıları',
              subtitle: 'Gemini, Claude veya OpenAI API anahtarınızı bağlayın',
              onTap: () => _showAiSettingsModal(context),
            ),

            const SizedBox(height: 20),
            _buildSectionHeader('SUNUCU & HESAP'),
            _buildSettingTile(
              icon: LucideIcons.server,
              iconColor: AppTheme.blue,
              title: 'Bağlı Sunucu',
              subtitle: auth.serverUrl ?? 'dispatch.local',
              trailing: TextButton(
                onPressed: () => auth.switchServer(),
                child: const Text('Değiştir', style: TextStyle(color: AppTheme.blue, fontSize: 12, fontWeight: FontWeight.bold)),
              ),
            ),
            _buildSettingTile(
              icon: LucideIcons.logOut,
              iconColor: AppTheme.red,
              title: 'Oturumu Kapat',
              subtitle: 'Bu cihazdaki oturumunuzu sonlandırır',
              onTap: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    backgroundColor: AppTheme.bgSecondary,
                    title: const Text('Çıkış Yapılsın mı?', style: TextStyle(color: AppTheme.textPrimary, fontSize: 16)),
                    content: const Text('Hesabınızdan çıkış yapmak istediğinize emin misiniz?', style: TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        child: const Text('İptal', style: TextStyle(color: AppTheme.textDim)),
                      ),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.red, foregroundColor: Colors.white),
                        onPressed: () => Navigator.pop(ctx, true),
                        child: const Text('Çıkış Yap'),
                      ),
                    ],
                  ),
                );
                if (confirm == true) {
                  auth.logout();
                }
              },
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          color: AppTheme.textDim,
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.8,
        ),
      ),
    );
  }

  Widget _buildSettingTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    Widget? trailing,
    VoidCallback? onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppTheme.bgSecondary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: ListTile(
          onTap: onTap,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          leading: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: iconColor),
          ),
          title: Text(
            title,
            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.w600),
          ),
          subtitle: Text(
            subtitle,
            style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
          ),
          trailing: trailing ?? (onTap != null ? const Icon(LucideIcons.chevronRight, size: 16, color: AppTheme.textDim) : null),
        ),
      ),
    );
  }

  static const TextStyle _settingLabelStyle = TextStyle(
    color: AppTheme.textMuted,
    fontSize: 11,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  );
}
