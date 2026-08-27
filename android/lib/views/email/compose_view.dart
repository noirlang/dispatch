import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../providers/email_provider.dart';
import '../../providers/contacts_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/sender_avatar.dart';

class ComposeView extends StatefulWidget {
  final String? initialTo;
  final String? initialSubject;
  final String? initialBody;
  final bool isReply;
  final int? replyEmailId;

  const ComposeView({
    super.key,
    this.initialTo,
    this.initialSubject,
    this.initialBody,
    this.isReply = false,
    this.replyEmailId,
  });

  @override
  State<ComposeView> createState() => _ComposeViewState();
}

class _ComposeViewState extends State<ComposeView> {
  late final TextEditingController _toController;
  late final TextEditingController _ccController;
  late final TextEditingController _bccController;
  late final TextEditingController _subjectController;
  late final TextEditingController _bodyController;

  bool _showCcBcc = false;
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    _toController = TextEditingController(text: widget.initialTo ?? '');
    _ccController = TextEditingController();
    _bccController = TextEditingController();
    _subjectController = TextEditingController(text: widget.initialSubject ?? '');
    _bodyController = TextEditingController(text: widget.initialBody ?? '');

    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ContactsProvider>().fetchAll();
    });
  }

  void _openContactPicker(TextEditingController targetController) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.bgSecondary,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        final contactsProvider = ctx.watch<ContactsProvider>();
        final contacts = contactsProvider.contacts;
        final groups = contactsProvider.groups;

        return DraggableScrollableSheet(
          initialChildSize: 0.6,
          maxChildSize: 0.85,
          minChildSize: 0.4,
          expand: false,
          builder: (_, scrollCtrl) => Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Kişi veya Grup Seç',
                      style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    IconButton(
                      icon: const Icon(LucideIcons.x, size: 18),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: ListView(
                    controller: scrollCtrl,
                    children: [
                      if (groups.isNotEmpty) ...[
                        const Text('GRUPLAR', style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                        const SizedBox(height: 6),
                        ...groups.map((g) => ListTile(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                              leading: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: AppTheme.blue.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(LucideIcons.usersRound, size: 16, color: AppTheme.blue),
                              ),
                              title: Text(g.name, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.bold)),
                              subtitle: Text('@${g.alias} · ${g.members.length} Üye', style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                              trailing: const Icon(LucideIcons.plus, size: 16, color: AppTheme.blue),
                              onTap: () {
                                final current = targetController.text.trim();
                                final groupAddrs = g.members.join(', ');
                                if (current.isEmpty) {
                                  targetController.text = groupAddrs;
                                } else {
                                  targetController.text = '$current, $groupAddrs';
                                }
                                Navigator.pop(ctx);
                              },
                            )),
                        const SizedBox(height: 14),
                      ],
                      const Text('KİŞİLER', style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                      const SizedBox(height: 6),
                      if (contacts.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Center(child: Text('Kayıtlı kişi bulunamadı.', style: TextStyle(color: AppTheme.textMuted, fontSize: 12))),
                        ),
                      ...contacts.map((c) => ListTile(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                            leading: SenderAvatar(
                              avatarUrl: c.avatarUrl,
                              initials: c.initials ?? c.name.substring(0, 1).toUpperCase(),
                              identifier: c.email,
                              size: 34,
                            ),
                            title: Text(c.name, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.bold)),
                            subtitle: Text(c.email, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11, fontFamily: 'monospace')),
                            trailing: const Icon(LucideIcons.plus, size: 16, color: AppTheme.blue),
                            onTap: () {
                              final current = targetController.text.trim();
                              if (current.isEmpty) {
                                targetController.text = c.email;
                              } else {
                                targetController.text = '$current, ${c.email}';
                              }
                              Navigator.pop(ctx);
                            },
                          )),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  void dispose() {
    _toController.dispose();
    _ccController.dispose();
    _bccController.dispose();
    _subjectController.dispose();
    _bodyController.dispose();
    super.dispose();
  }

  Future<void> _handleSend() async {
    final to = _toController.text.trim();
    final subject = _subjectController.text.trim();
    final body = _bodyController.text.trim();

    if (to.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lütfen bir alıcı e-posta adresi girin'), backgroundColor: AppTheme.red),
      );
      return;
    }

    setState(() => _isSending = true);

    try {
      final emailProvider = context.read<EmailProvider>();
      if (widget.isReply && widget.replyEmailId != null) {
        await emailProvider.replyEmail(widget.replyEmailId!, body: body);
      } else {
        await emailProvider.sendEmail(
          to: to,
          cc: _ccController.text.isNotEmpty ? _ccController.text : null,
          bcc: _bccController.text.isNotEmpty ? _bccController.text : null,
          subject: subject.isNotEmpty ? subject : '(Başlıksız)',
          body: body,
        );
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('E-posta başarıyla gönderildi!'), backgroundColor: AppTheme.green),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSending = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gönderilemedi: $e'), backgroundColor: AppTheme.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.x, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(widget.isReply ? 'Yanıtla' : 'Yeni E-Posta'),
        actions: [
          IconButton(
            icon: Icon(
              _showCcBcc ? LucideIcons.chevronUp : LucideIcons.chevronDown,
              size: 18,
              color: AppTheme.textMuted,
            ),
            tooltip: 'Cc / Bcc',
            onPressed: () => setState(() => _showCcBcc = !_showCcBcc),
          ),
          const SizedBox(width: 4),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accent,
                foregroundColor: AppTheme.accentInvert,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: _isSending
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.accentInvert),
                    )
                  : const Icon(LucideIcons.send, size: 14),
              label: const Text('Gönder', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              onPressed: _isSending ? null : _handleSend,
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // To field
            TextField(
              controller: _toController,
              keyboardType: TextInputType.emailAddress,
              style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
              decoration: InputDecoration(
                labelText: 'Kime:',
                hintText: 'alici@domain.com veya @ekip',
                prefixIcon: const Icon(LucideIcons.user, size: 16, color: AppTheme.textMuted),
                suffixIcon: IconButton(
                  icon: const Icon(LucideIcons.users, size: 18, color: AppTheme.blue),
                  tooltip: 'Kişi veya Grup Seç',
                  onPressed: () => _openContactPicker(_toController),
                ),
              ),
            ),

            if (_showCcBcc) ...[
              const SizedBox(height: 10),
              TextField(
                controller: _ccController,
                style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13),
                decoration: const InputDecoration(
                  labelText: 'Cc:',
                  hintText: 'bilgi@domain.com',
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _bccController,
                style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13),
                decoration: const InputDecoration(
                  labelText: 'Bcc:',
                  hintText: 'gizli@domain.com',
                ),
              ),
            ],

            const SizedBox(height: 12),

            // Subject field
            TextField(
              controller: _subjectController,
              style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.w600),
              decoration: const InputDecoration(
                labelText: 'Konu:',
                hintText: 'E-posta konusu...',
              ),
            ),

            const SizedBox(height: 16),

            // Body Markdown field
            TextField(
              controller: _bodyController,
              maxLines: 14,
              style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, height: 1.5),
              decoration: InputDecoration(
                hintText: 'İletinizi buraya yazın (Email.md ve Markdown desteklenir)...',
                filled: true,
                fillColor: AppTheme.bgSecondary,
                alignLabelWithHint: true,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppTheme.borderColor),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
