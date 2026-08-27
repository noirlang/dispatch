import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../providers/email_provider.dart';
import '../../theme/app_theme.dart';

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
              decoration: const InputDecoration(
                labelText: 'Kime:',
                hintText: 'alici@domain.com veya @ekip',
                prefixIcon: Icon(LucideIcons.user, size: 16, color: AppTheme.textMuted),
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
