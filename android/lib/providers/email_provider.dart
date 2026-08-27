import 'package:flutter/material.dart';
import '../models/email.dart';
import '../services/api_service.dart';
import '../services/cache_service.dart';

class EmailProvider extends ChangeNotifier {
  String _currentFolder = 'inbox';
  List<EmailItem> _emails = [];
  bool _isLoading = false;
  String? _errorMessage;
  int _approvalsCount = 0;

  String get currentFolder => _currentFolder;
  List<EmailItem> get emails => _emails;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  int get approvalsCount => _approvalsCount;

  // 1. Fetch emails for folder (Offline-First)
  Future<void> fetchEmails(String folder, {bool forceRefresh = false}) async {
    _currentFolder = folder;
    _errorMessage = null;

    // Load from offline cache first for instant responsiveness
    final cached = await CacheService.getEmails(folder);
    if (cached != null && cached.isNotEmpty && !forceRefresh) {
      _emails = cached
          .whereType<Map<String, dynamic>>()
          .map((j) => EmailItem.fromJson(j))
          .toList();
      notifyListeners();
    } else {
      _isLoading = true;
      notifyListeners();
    }

    try {
      final res = await ApiService.get('/emails', queryParams: {'folder': folder});
      if (res is List) {
        _emails = res
            .whereType<Map<String, dynamic>>()
            .map((j) => EmailItem.fromJson(j))
            .toList();

        // Save fresh data to local cache
        await CacheService.saveEmails(folder, res);
      }

      // Check approvals count in background if not already in approvals
      if (folder != 'approvals') {
        _checkApprovalsCount();
      } else {
        _approvalsCount = _emails.length;
      }
    } catch (e) {
      if (_emails.isEmpty) {
        _errorMessage = e.toString();
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // 2. Approvals badge counter
  Future<void> _checkApprovalsCount() async {
    try {
      final res = await ApiService.get('/emails', queryParams: {'folder': 'approvals'});
      if (res is List) {
        _approvalsCount = res.length;
        notifyListeners();
      }
    } catch (_) {}
  }

  // 3. Fetch single email detail
  Future<EmailItem?> fetchEmailDetail(int id) async {
    try {
      final res = await ApiService.get('/emails/$id');
      if (res is Map<String, dynamic>) {
        final email = EmailItem.fromJson(res);
        // Update read status in list
        final idx = _emails.indexWhere((e) => e.id == id);
        if (idx != -1) {
          _emails[idx] = email;
          notifyListeners();
        }
        return email;
      }
    } catch (_) {}
    return null;
  }

  // 4. Mark as read
  Future<void> markAsRead(int id) async {
    final idx = _emails.indexWhere((e) => e.id == id);
    if (idx != -1 && !_emails[idx].isRead) {
      // Optimistic update
      _emails[idx] = EmailItem(
        id: _emails[idx].id,
        from: _emails[idx].from,
        to: _emails[idx].to,
        cc: _emails[idx].cc,
        bcc: _emails[idx].bcc,
        subject: _emails[idx].subject,
        body: _emails[idx].body,
        bodyText: _emails[idx].bodyText,
        bodyHtml: _emails[idx].bodyHtml,
        folder: _emails[idx].folder,
        isRead: true,
        isFlagged: _emails[idx].isFlagged,
        isImportantSender: _emails[idx].isImportantSender,
        createdAt: _emails[idx].createdAt,
        attachments: _emails[idx].attachments,
        hasAttachments: _emails[idx].hasAttachments,
        senderName: _emails[idx].senderName,
        avatarUrl: _emails[idx].avatarUrl,
        avatarInitials: _emails[idx].avatarInitials,
        isKnownCompany: _emails[idx].isKnownCompany,
        isDispatchUser: _emails[idx].isDispatchUser,
      );
      notifyListeners();
    }
  }

  // 5. Toggle Flag
  Future<void> toggleFlag(int id) async {
    final idx = _emails.indexWhere((e) => e.id == id);
    if (idx != -1) {
      final current = _emails[idx].isFlagged;
      _emails[idx] = EmailItem(
        id: _emails[idx].id,
        from: _emails[idx].from,
        to: _emails[idx].to,
        cc: _emails[idx].cc,
        bcc: _emails[idx].bcc,
        subject: _emails[idx].subject,
        body: _emails[idx].body,
        bodyText: _emails[idx].bodyText,
        bodyHtml: _emails[idx].bodyHtml,
        folder: _emails[idx].folder,
        isRead: _emails[idx].isRead,
        isFlagged: !current,
        isImportantSender: _emails[idx].isImportantSender,
        createdAt: _emails[idx].createdAt,
        attachments: _emails[idx].attachments,
        hasAttachments: _emails[idx].hasAttachments,
        senderName: _emails[idx].senderName,
        avatarUrl: _emails[idx].avatarUrl,
        avatarInitials: _emails[idx].avatarInitials,
        isKnownCompany: _emails[idx].isKnownCompany,
        isDispatchUser: _emails[idx].isDispatchUser,
      );
      notifyListeners();

      try {
        await ApiService.post('/emails/$id/toggle_flag');
      } catch (_) {}
    }
  }

  // 6. Toggle Important Sender (⭐)
  Future<bool> toggleImportantSender(int id) async {
    try {
      final res = await ApiService.post('/emails/$id/toggle_important_sender');
      if (res is Map<String, dynamic>) {
        final isImp = res['is_important'] == true;
        final idx = _emails.indexWhere((e) => e.id == id);
        if (idx != -1) {
          _emails[idx] = EmailItem(
            id: _emails[idx].id,
            from: _emails[idx].from,
            to: _emails[idx].to,
            cc: _emails[idx].cc,
            bcc: _emails[idx].bcc,
            subject: _emails[idx].subject,
            body: _emails[idx].body,
            bodyText: _emails[idx].bodyText,
            bodyHtml: _emails[idx].bodyHtml,
            folder: _emails[idx].folder,
            isRead: _emails[idx].isRead,
            isFlagged: _emails[idx].isFlagged,
            isImportantSender: isImp,
            createdAt: _emails[idx].createdAt,
            attachments: _emails[idx].attachments,
            hasAttachments: _emails[idx].hasAttachments,
            senderName: _emails[idx].senderName,
            avatarUrl: _emails[idx].avatarUrl,
            avatarInitials: _emails[idx].avatarInitials,
            isKnownCompany: _emails[idx].isKnownCompany,
            isDispatchUser: _emails[idx].isDispatchUser,
          );
          notifyListeners();
        }
        return isImp;
      }
    } catch (_) {}
    return false;
  }

  // 7. Approve sender (moves to inbox)
  Future<bool> approveSender(int id) async {
    try {
      await ApiService.post('/emails/$id/approve');
      _emails.removeWhere((e) => e.id == id);
      if (_approvalsCount > 0) _approvalsCount--;
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }

  // 8. Reject sender
  Future<bool> rejectSender(int id) async {
    try {
      await ApiService.post('/emails/$id/reject');
      _emails.removeWhere((e) => e.id == id);
      if (_approvalsCount > 0) _approvalsCount--;
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }

  // 9. Block sender
  Future<bool> blockSender(int id) async {
    try {
      await ApiService.post('/emails/$id/block_sender');
      _emails.removeWhere((e) => e.id == id);
      if (_approvalsCount > 0) _approvalsCount--;
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }

  // 10. Delete email (moves to trash)
  Future<bool> deleteEmail(int id) async {
    _emails.removeWhere((e) => e.id == id);
    notifyListeners();

    try {
      await ApiService.delete('/emails/$id');
      return true;
    } catch (_) {
      return false;
    }
  }

  // 11. Send email
  Future<bool> sendEmail({
    required String to,
    String? cc,
    String? bcc,
    required String subject,
    required String body,
    List<dynamic>? attachments,
  }) async {
    try {
      await ApiService.post('/emails', body: {
        'to': to,
        'cc': cc,
        'bcc': bcc,
        'subject': subject,
        'body': body,
        'attachments': attachments ?? [],
      });
      return true;
    } catch (e) {
      rethrow;
    }
  }

  // 12. Reply email
  Future<bool> replyEmail(int id, {required String body, List<dynamic>? attachments}) async {
    try {
      await ApiService.post('/emails/$id/reply', body: {
        'body': body,
        'attachments': attachments ?? [],
      });
      return true;
    } catch (e) {
      rethrow;
    }
  }

  // 13. Forward email
  Future<bool> forwardEmail(int id, {required String to, required String body, List<dynamic>? attachments}) async {
    try {
      await ApiService.post('/emails/$id/forward', body: {
        'to': to,
        'body': body,
        'attachments': attachments ?? [],
      });
      return true;
    } catch (e) {
      rethrow;
    }
  }

  // 14. AI Summary
  Future<String?> fetchAiSummary(int id) async {
    try {
      final res = await ApiService.post('/emails/$id/ai_summary');
      if (res is Map<String, dynamic>) {
        return res['summary'];
      }
    } catch (e) {
      rethrow;
    }
    return null;
  }

  // 15. AI Smart Reply
  Future<String?> generateAiReply(int id, {String? instructions, String? tone}) async {
    try {
      final res = await ApiService.post('/emails/$id/ai_reply', body: {
        'instructions': instructions,
        'tone': tone ?? 'professional',
      });
      if (res is Map<String, dynamic>) {
        return res['reply_body'];
      }
    } catch (e) {
      rethrow;
    }
    return null;
  }

  // 16. AI Translate
  Future<Map<String, dynamic>?> translateEmail(int id, String targetLang) async {
    try {
      final res = await ApiService.post('/emails/$id/ai_translate', body: {
        'target_language': targetLang,
      });
      if (res is Map<String, dynamic>) {
        return res;
      }
    } catch (e) {
      rethrow;
    }
    return null;
  }
}
