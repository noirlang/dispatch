import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../models/email.dart';
import '../theme/app_theme.dart';
import 'sender_avatar.dart';

class EmailItemTile extends StatelessWidget {
  final EmailItem email;
  final VoidCallback onTap;
  final VoidCallback? onToggleFlag;
  final VoidCallback? onDelete;

  const EmailItemTile({
    super.key,
    required this.email,
    required this.onTap,
    this.onToggleFlag,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final displayName = email.senderName?.isNotEmpty == true
        ? email.senderName!
        : email.from.split('@').first;

    final snippet = (email.bodyText ?? email.body ?? '')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: email.isRead ? Colors.transparent : AppTheme.bgSecondary.withOpacity(0.4),
          border: const Border(
            bottom: BorderSide(color: AppTheme.borderColor, width: 0.6),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Unread dot indicator
            Container(
              width: 8,
              height: 8,
              margin: const EdgeInsets.only(top: 14, right: 10),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: email.isRead ? Colors.transparent : AppTheme.blue,
              ),
            ),

            // Sender Avatar
            SenderAvatar(
              avatarUrl: email.avatarUrl,
              initials: email.avatarInitials ?? '',
              identifier: email.from,
              isKnownCompany: email.isKnownCompany,
              isDispatchUser: email.isDispatchUser,
              size: 38,
            ),
            const SizedBox(width: 12),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top row: Sender Name & Date & Star
                  Row(
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Flexible(
                              child: Text(
                                displayName,
                                style: TextStyle(
                                  color: email.isRead ? AppTheme.textSecondary : AppTheme.textPrimary,
                                  fontSize: 14,
                                  fontWeight: email.isRead ? FontWeight.w500 : FontWeight.w700,
                                  letterSpacing: -0.2,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (email.isImportantSender) ...[
                              const SizedBox(width: 4),
                              const Icon(LucideIcons.star, size: 12, color: AppTheme.amber),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _formatDate(email.createdAt),
                        style: TextStyle(
                          color: email.isRead ? AppTheme.textDim : AppTheme.blue,
                          fontSize: 11,
                          fontWeight: email.isRead ? FontWeight.normal : FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),

                  // Subject
                  Text(
                    email.subject.isNotEmpty ? email.subject : '(Başlıksız)',
                    style: TextStyle(
                      color: email.isRead ? AppTheme.textSecondary : AppTheme.textPrimary,
                      fontSize: 13,
                      fontWeight: email.isRead ? FontWeight.w400 : FontWeight.w600,
                      letterSpacing: -0.1,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 3),

                  // Snippet & Attachment icon
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          snippet.isNotEmpty ? snippet : '(Metin içeriği yok)',
                          style: const TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 12,
                            height: 1.3,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (email.hasAttachments) ...[
                        const SizedBox(width: 6),
                        const Icon(LucideIcons.paperclip, size: 12, color: AppTheme.textMuted),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    try {
      final now = DateTime.now();
      final difference = now.difference(date);

      if (difference.inDays == 0 && now.day == date.day) {
        return DateFormat('HH:mm').format(date);
      } else if (difference.inDays < 7) {
        return DateFormat('E', 'tr').format(date);
      } else {
        return DateFormat('d MMM', 'tr').format(date);
      }
    } catch (_) {
      final h = date.hour.toString().padLeft(2, '0');
      final m = date.minute.toString().padLeft(2, '0');
      return '$h:$m';
    }
  }
}
