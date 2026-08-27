import 'package:flutter/material.dart';
import 'package:flutter_widget_from_html/flutter_widget_from_html.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/email.dart';
import '../../providers/email_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/sender_avatar.dart';
import 'compose_view.dart';

class EmailReaderView extends StatefulWidget {
  final int emailId;
  final EmailItem? initialEmail;

  const EmailReaderView({
    super.key,
    required this.emailId,
    this.initialEmail,
  });

  @override
  State<EmailReaderView> createState() => _EmailReaderViewState();
}

class _EmailReaderViewState extends State<EmailReaderView> {
  EmailItem? _email;
  bool _isLoading = false;
  bool _isLightMode = false;

  // AI states
  String? _aiSummary;
  bool _loadingSummary = false;
  Map<String, dynamic>? _translation;
  bool _translating = false;

  @override
  void initState() {
    super.initState();
    _email = widget.initialEmail;
    _fetchDetail();
  }

  Future<void> _fetchDetail() async {
    setState(() => _isLoading = true);
    final email = await context.read<EmailProvider>().fetchEmailDetail(widget.emailId);
    if (email != null && mounted) {
      setState(() {
        _email = email;
        _isLoading = false;
      });
    } else {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleAiSummary() async {
    setState(() => _loadingSummary = true);
    try {
      final summary = await context.read<EmailProvider>().fetchAiSummary(widget.emailId);
      if (mounted) {
        setState(() {
          _aiSummary = summary;
          _loadingSummary = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loadingSummary = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Özet alınamadı: $e'), backgroundColor: AppTheme.red),
        );
      }
    }
  }

  void _showAiReplyModal() {
    final instructionsController = TextEditingController();
    String selectedTone = 'professional';

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
                        'Yapay Zeka ile Yanıtla',
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
              const SizedBox(height: 12),
              const Text(
                'Yanıt Talimatı (Opsiyonel):',
                style: TextStyle(color: AppTheme.textMuted, fontSize: 12, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: instructionsController,
                style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13),
                decoration: const InputDecoration(
                  hintText: 'Örn: Teklifi kabul et, cuma günü için randevu ver...',
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Ton:',
                style: TextStyle(color: AppTheme.textMuted, fontSize: 12, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _buildToneChip('Profesyonel', 'professional', selectedTone, (t) => setModalState(() => selectedTone = t)),
                  const SizedBox(width: 8),
                  _buildToneChip('Samimi', 'friendly', selectedTone, (t) => setModalState(() => selectedTone = t)),
                  const SizedBox(width: 8),
                  _buildToneChip('Kısa & Öz', 'concise', selectedTone, (t) => setModalState(() => selectedTone = t)),
                ],
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.accent,
                  foregroundColor: AppTheme.accentInvert,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () async {
                  Navigator.pop(ctx);
                  try {
                    final reply = await context.read<EmailProvider>().generateAiReply(
                      widget.emailId,
                      instructions: instructionsController.text,
                      tone: selectedTone,
                    );
                    if (reply != null && mounted) {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ComposeView(
                            initialTo: _email?.from ?? '',
                            initialSubject: 'Re: ${_email?.subject ?? ""}',
                            initialBody: reply,
                            isReply: true,
                            replyEmailId: _email?.id,
                          ),
                        ),
                      );
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Yanıt üretilemedi: $e'), backgroundColor: AppTheme.red),
                      );
                    }
                  }
                },
                child: const Text('Yanıt Taslağı Oluştur', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildToneChip(String label, String value, String current, Function(String) onSelect) {
    final isSelected = value == current;
    return InkWell(
      onTap: () => onSelect(value),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.bgTertiary : AppTheme.bgPrimary,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isSelected ? AppTheme.blue : AppTheme.borderColor),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? AppTheme.blue : AppTheme.textMuted,
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  void _showTranslateModal() {
    final languages = [
      {'code': 'tr', 'name': 'Türkçe', 'flag': '🇹🇷'},
      {'code': 'en', 'name': 'English', 'flag': '🇬🇧'},
      {'code': 'de', 'name': 'Deutsch', 'flag': '🇩🇪'},
      {'code': 'fr', 'name': 'Français', 'flag': '🇫🇷'},
      {'code': 'es', 'name': 'Español', 'flag': '🇪🇸'},
      {'code': 'it', 'name': 'Italiano', 'flag': '🇮🇹'},
    ];

    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.bgSecondary,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Hedef Dili Seçin',
              style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            ...languages.map((l) {
              return ListTile(
                leading: Text(l['flag']!, style: const TextStyle(fontSize: 20)),
                title: Text(l['name']!, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14)),
                trailing: const Icon(LucideIcons.chevronRight, size: 16, color: AppTheme.textMuted),
                onTap: () async {
                  Navigator.pop(ctx);
                  setState(() => _translating = true);
                  try {
                    final res = await context.read<EmailProvider>().translateEmail(widget.emailId, l['code']!);
                    if (mounted) {
                      setState(() {
                        _translation = res;
                        _translating = false;
                      });
                    }
                  } catch (e) {
                    if (mounted) {
                      setState(() => _translating = false);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Çeviri yapılamadı: $e'), backgroundColor: AppTheme.red),
                      );
                    }
                  }
                },
              );
            }),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final email = _email;
    if (email == null && _isLoading) {
      return const Scaffold(
        backgroundColor: AppTheme.bgPrimary,
        body: Center(child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.textMuted)),
      );
    }

    if (email == null) {
      return Scaffold(
        backgroundColor: AppTheme.bgPrimary,
        appBar: AppBar(),
        body: const Center(child: Text('E-posta bulunamadı', style: TextStyle(color: AppTheme.textMuted))),
      );
    }

    final isApprovals = email.folder == 'approvals';
    final rawHtml = email.bodyHtml?.trim() ?? '';
    final hasHtml = rawHtml.isNotEmpty;
    final isImportant = email.isImportantSender;

    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          // Theme switch toggle for HTML emails
          if (hasHtml)
            IconButton(
              icon: Icon(
                _isLightMode ? LucideIcons.moon : LucideIcons.sun,
                size: 18,
                color: _isLightMode ? AppTheme.amber : AppTheme.textMuted,
              ),
              tooltip: _isLightMode ? 'Karanlık Mod' : 'Açık Tema (Orijinal)',
              onPressed: () => setState(() => _isLightMode = !_isLightMode),
            ),
          // Important star toggle
          IconButton(
            icon: Icon(
              isImportant ? LucideIcons.star : LucideIcons.star,
              size: 18,
              color: isImportant ? AppTheme.amber : AppTheme.textMuted,
            ),
            onPressed: () {
              context.read<EmailProvider>().toggleImportantSender(email.id);
            },
          ),
          // Delete to trash
          IconButton(
            icon: const Icon(LucideIcons.trash2, size: 18, color: AppTheme.textMuted),
            onPressed: () {
              context.read<EmailProvider>().deleteEmail(email.id);
              Navigator.pop(context);
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: const BoxDecoration(
          color: AppTheme.bgSecondary,
          border: Border(top: BorderSide(color: AppTheme.borderColor)),
        ),
        child: SafeArea(
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.textPrimary,
                    side: const BorderSide(color: AppTheme.borderColor),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(LucideIcons.reply, size: 16),
                  label: const Text('Yanıtla', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => ComposeView(
                          initialTo: email.from,
                          initialSubject: 'Re: ${email.subject}',
                          initialBody: '\n\n---\n${email.bodyText ?? ""}',
                          isReply: true,
                          replyEmailId: email.id,
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.textPrimary,
                    side: const BorderSide(color: AppTheme.borderColor),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(LucideIcons.forward, size: 16),
                  label: const Text('İlet', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => ComposeView(
                          initialSubject: 'Fwd: ${email.subject}',
                          initialBody: '\n\n---------- Yönlendirilen İleti ----------\nGönderen: ${email.from}\nKonu: ${email.subject}\n\n${email.bodyText ?? ""}',
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Subject title
            Text(
              _translation != null ? _translation!['translated_subject'] : email.subject,
              style: const TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 12),

            // Sender & Date Card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.bgSecondary,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppTheme.borderColor),
              ),
              child: Row(
                children: [
                  SenderAvatar(
                    avatarUrl: email.avatarUrl,
                    initials: email.avatarInitials ?? '',
                    identifier: email.from,
                    isKnownCompany: email.isKnownCompany,
                    isDispatchUser: email.isDispatchUser,
                    size: 44,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          email.senderName?.isNotEmpty == true ? email.senderName! : email.from.split('@').first,
                          style: const TextStyle(
                            color: AppTheme.textPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          email.from,
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Kime: ${email.to}',
                          style: const TextStyle(color: AppTheme.textDim, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        DateFormat('d MMM, HH:mm', 'tr').format(email.createdAt),
                        style: const TextStyle(color: AppTheme.textDim, fontSize: 11),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Approval Queue Action Banner
            if (isApprovals) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.amber.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppTheme.amber.withOpacity(0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(LucideIcons.alertCircle, color: AppTheme.amber, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'İlk Kez Gelen Gönderici',
                          style: TextStyle(color: AppTheme.amber, fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Bu gönderici henüz onay listenizde değil. Onaylarsanız sonraki e-postaları doğrudan Gelen Kutusu\'na düşecektir.',
                      style: TextStyle(color: AppTheme.textSecondary, fontSize: 12, height: 1.3),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.green,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            minimumSize: Size.zero,
                          ),
                          icon: const Icon(LucideIcons.check, size: 14),
                          label: const Text('Onayla', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          onPressed: () {
                            context.read<EmailProvider>().approveSender(email.id);
                            Navigator.pop(context);
                          },
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppTheme.red,
                            side: BorderSide(color: AppTheme.red.withOpacity(0.4)),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            minimumSize: Size.zero,
                          ),
                          icon: const Icon(LucideIcons.x, size: 14),
                          label: const Text('Reddet', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          onPressed: () {
                            context.read<EmailProvider>().rejectSender(email.id);
                            Navigator.pop(context);
                          },
                        ),
                        const Spacer(),
                        TextButton(
                          onPressed: () {
                            context.read<EmailProvider>().blockSender(email.id);
                            Navigator.pop(context);
                          },
                          child: const Text('Blokla', style: TextStyle(color: AppTheme.textDim, fontSize: 12)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],

            // AI Action Buttons Toolbar
            const SizedBox(height: 14),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildAiActionButton(
                    icon: LucideIcons.sparkles,
                    label: _loadingSummary ? 'Özetleniyor...' : 'AI Özeti',
                    onTap: _handleAiSummary,
                  ),
                  const SizedBox(width: 8),
                  _buildAiActionButton(
                    icon: LucideIcons.messageSquare,
                    label: 'Akıllı Yanıt',
                    onTap: _showAiReplyModal,
                  ),
                  const SizedBox(width: 8),
                  _buildAiActionButton(
                    icon: LucideIcons.languages,
                    label: _translating ? 'Çevriliyor...' : 'Çevir',
                    onTap: _showTranslateModal,
                  ),
                ],
              ),
            ),

            // AI Summary box if present
            if (_aiSummary != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.blue.withOpacity(0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(LucideIcons.sparkles, size: 14, color: AppTheme.blue),
                            SizedBox(width: 6),
                            Text(
                              'YAPAY ZEKA ÖZETİ',
                              style: TextStyle(
                                color: AppTheme.blue,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                        InkWell(
                          onTap: () => setState(() => _aiSummary = null),
                          child: const Icon(LucideIcons.x, size: 14, color: AppTheme.textMuted),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _aiSummary!,
                      style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, height: 1.4),
                    ),
                  ],
                ),
              ),
            ],

            // Attachments Section
            if (email.attachments.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Text(
                'EKLER',
                style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: email.attachments.map((att) {
                  return InkWell(
                    onTap: () {
                      if (att.url.isNotEmpty) launchUrl(Uri.parse(att.url));
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppTheme.bgSecondary,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.borderColor),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(att.isImage ? LucideIcons.image : LucideIcons.file, size: 14, color: AppTheme.blue),
                          const SizedBox(width: 8),
                          Text(
                            att.filename,
                            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 12, fontWeight: FontWeight.w500),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            att.formattedSize,
                            style: const TextStyle(color: AppTheme.textDim, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],

            const SizedBox(height: 16),
            const Divider(color: AppTheme.borderColor),
            const SizedBox(height: 12),

            // Email Body Content Area
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _isLightMode ? Colors.white : AppTheme.bgSecondary,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: _isLightMode ? Colors.grey.shade300 : AppTheme.borderColor),
              ),
              child: _translation != null
                  ? Text(
                      _translation!['translated_body'],
                      style: TextStyle(
                        color: _isLightMode ? Colors.black87 : AppTheme.textPrimary,
                        fontSize: 14,
                        height: 1.6,
                      ),
                    )
                  : hasHtml
                      ? HtmlWidget(
                          rawHtml,
                          textStyle: TextStyle(
                            color: _isLightMode ? Colors.black87 : AppTheme.textPrimary,
                            fontSize: 14,
                            height: 1.6,
                          ),
                          customStylesBuilder: (element) {
                            if (!_isLightMode) {
                              if (element.localName == 'table' || element.localName == 'td' || element.localName == 'th') {
                                return {'background-color': 'transparent', 'color': '#f4f4f5'};
                              }
                            }
                            return null;
                          },
                          onTapUrl: (url) async {
                            await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                            return true;
                          },
                        )
                      : SelectableText(
                          email.bodyText ?? email.body ?? '',
                          style: TextStyle(
                            color: _isLightMode ? Colors.black87 : AppTheme.textPrimary,
                            fontSize: 14,
                            height: 1.6,
                            fontFamily: 'sans-serif',
                          ),
                        ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildAiActionButton({required IconData icon, required String label, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: AppTheme.bgSecondary,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.borderColor),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 13, color: AppTheme.blue),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(color: AppTheme.textPrimary, fontSize: 12, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}
