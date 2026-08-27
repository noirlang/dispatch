import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../models/email.dart';

class WidgetService {
  static const MethodChannel _channel = MethodChannel('com.noirlang.dispatch/widget');

  static Future<void> updateInboxWidget({
    required List<EmailItem> emails,
    required int unreadCount,
  }) async {
    try {
      final inboxEmails = emails.where((e) => e.folder == 'inbox').toList();
      final mail1 = inboxEmails.isNotEmpty ? inboxEmails[0] : null;
      final mail2 = inboxEmails.length > 1 ? inboxEmails[1] : null;

      final data = <String, dynamic>{
        'unread_count': unreadCount,
      };

      if (mail1 != null) {
        data['m1_id'] = mail1.id;
        data['m1_sender'] = (mail1.senderName != null && mail1.senderName!.isNotEmpty) ? mail1.senderName! : mail1.from;
        data['m1_initials'] = (mail1.avatarInitials != null && mail1.avatarInitials!.isNotEmpty) ? mail1.avatarInitials! : 'D';
        data['m1_subject'] = mail1.subject.isNotEmpty ? mail1.subject : '(Başlıksız)';
        data['m1_snippet'] = mail1.effectiveSnippet.isNotEmpty ? mail1.effectiveSnippet : '';
        data['m1_time'] = _formatTime(mail1.createdAt);
      }

      if (mail2 != null) {
        data['m2_id'] = mail2.id;
        data['m2_sender'] = (mail2.senderName != null && mail2.senderName!.isNotEmpty) ? mail2.senderName! : mail2.from;
        data['m2_initials'] = (mail2.avatarInitials != null && mail2.avatarInitials!.isNotEmpty) ? mail2.avatarInitials! : 'D';
        data['m2_subject'] = mail2.subject.isNotEmpty ? mail2.subject : '(Başlıksız)';
        data['m2_snippet'] = mail2.effectiveSnippet.isNotEmpty ? mail2.effectiveSnippet : '';
        data['m2_time'] = _formatTime(mail2.createdAt);
      }

      await _channel.invokeMethod('updateWidgetData', data);
    } catch (_) {}
  }

  static String _formatTime(DateTime dt) {
    final now = DateTime.now();
    if (dt.year == now.year && dt.month == now.month && dt.day == now.day) {
      return DateFormat('HH:mm').format(dt);
    } else {
      return DateFormat('dd.MM').format(dt);
    }
  }

  static Future<int?> getInitialEmailId() async {
    try {
      final id = await _channel.invokeMethod<int>('getInitialEmailId');
      return id;
    } catch (_) {
      return null;
    }
  }

  static void setOpenEmailHandler(void Function(int emailId) handler) {
    _channel.setMethodCallHandler((call) async {
      if (call.method == 'onOpenEmail') {
        final id = call.arguments as int?;
        if (id != null && id > 0) {
          handler(id);
        }
      }
    });
  }
}
