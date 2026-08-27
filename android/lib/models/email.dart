class EmailAttachment {
  final String? id;
  final String filename;
  final String contentType;
  final int size;
  final String url;
  final bool isImage;

  EmailAttachment({
    this.id,
    required this.filename,
    required this.contentType,
    required this.size,
    required this.url,
    this.isImage = false,
  });

  factory EmailAttachment.fromJson(Map<String, dynamic> json) {
    final mime = (json['content_type'] ?? '').toString().toLowerCase();
    final name = (json['filename'] ?? '').toString().toLowerCase();
    final isImg = mime.startsWith('image/') ||
        name.endsWith('.png') ||
        name.endsWith('.jpg') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.gif') ||
        name.endsWith('.webp') ||
        (json['is_image'] == true);

    return EmailAttachment(
      id: json['id']?.toString(),
      filename: json['filename'] ?? 'attachment',
      contentType: json['content_type'] ?? 'application/octet-stream',
      size: json['size'] is int ? json['size'] : int.tryParse(json['size'].toString()) ?? 0,
      url: json['url'] ?? '',
      isImage: isImg,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'filename': filename,
      'content_type': contentType,
      'size': size,
      'url': url,
      'is_image': isImage,
    };
  }

  String get formattedSize {
    final kb = (size / 1024).round();
    if (kb > 1024) {
      return '${(kb / 1024).toStringAsFixed(1)} MB';
    }
    return '$kb KB';
  }
}

class EmailItem {
  final int id;
  final String from;
  final String to;
  final String? cc;
  final String? bcc;
  final String subject;
  final String? snippet;
  final String? body;
  final String? bodyText;
  final String? bodyHtml;
  final String folder;
  final bool isRead;
  final bool isFlagged;
  final bool isImportantSender;
  final DateTime createdAt;
  final List<EmailAttachment> attachments;
  final bool hasAttachments;
  final String? senderName;
  final String? avatarUrl;
  final String? avatarInitials;
  final bool isKnownCompany;
  final bool isDispatchUser;

  EmailItem({
    required this.id,
    required this.from,
    required this.to,
    this.cc,
    this.bcc,
    required this.subject,
    this.snippet,
    this.body,
    this.bodyText,
    this.bodyHtml,
    required this.folder,
    this.isRead = false,
    this.isFlagged = false,
    this.isImportantSender = false,
    required this.createdAt,
    this.attachments = const [],
    this.hasAttachments = false,
    this.senderName,
    this.avatarUrl,
    this.avatarInitials,
    this.isKnownCompany = false,
    this.isDispatchUser = false,
  });

  String get effectiveSnippet {
    if (snippet != null && snippet!.trim().isNotEmpty) {
      return snippet!.replaceAll(RegExp(r'\s+'), ' ').trim();
    }
    if (bodyText != null && bodyText!.trim().isNotEmpty) {
      return bodyText!.replaceAll(RegExp(r'\s+'), ' ').trim();
    }
    if (body != null && body!.trim().isNotEmpty) {
      return body!.replaceAll(RegExp(r'\s+'), ' ').trim();
    }
    if (bodyHtml != null && bodyHtml!.trim().isNotEmpty) {
      final clean = bodyHtml!
          .replaceAll(RegExp(r'<style[^>]*>.*?</style>', caseSensitive: false, dotAll: true), '')
          .replaceAll(RegExp(r'<script[^>]*>.*?</script>', caseSensitive: false, dotAll: true), '')
          .replaceAll(RegExp(r'<[^>]*>'), ' ')
          .replaceAll(RegExp(r'\s+'), ' ')
          .trim();
      if (clean.isNotEmpty) return clean;
    }
    return subject.isNotEmpty ? subject : 'İletiyi görüntülemek için dokunun';
  }

  factory EmailItem.fromJson(Map<String, dynamic> json) {
    var rawAttachments = json['attachments'];
    List<EmailAttachment> parsedAttachments = [];
    if (rawAttachments is List) {
      parsedAttachments = rawAttachments
          .whereType<Map<String, dynamic>>()
          .map((a) => EmailAttachment.fromJson(a))
          .toList();
    }

    DateTime parsedDate;
    try {
      parsedDate = DateTime.parse(json['created_at'] ?? DateTime.now().toIso8601String());
    } catch (_) {
      parsedDate = DateTime.now();
    }

    final fromAddr = json['from'] ?? json['from_address'] ?? '';
    final initials = (json['avatar_initials'] != null && json['avatar_initials'].toString().isNotEmpty)
        ? json['avatar_initials'].toString()
        : _extractInitials(json['sender_name'] ?? fromAddr);

    return EmailItem(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      from: fromAddr,
      to: json['to'] ?? json['to_address'] ?? '',
      cc: json['cc'],
      bcc: json['bcc'],
      subject: json['subject'] ?? '(Başlıksız)',
      snippet: json['snippet'],
      body: json['body'],
      bodyText: json['body_text'] ?? json['body'],
      bodyHtml: json['body_html'],
      folder: json['folder'] ?? 'inbox',
      isRead: json['is_read'] == true,
      isFlagged: json['is_flagged'] == true,
      isImportantSender: json['is_important_sender'] == true,
      createdAt: parsedDate,
      attachments: parsedAttachments,
      hasAttachments: json['has_attachments'] == true || parsedAttachments.isNotEmpty,
      senderName: json['sender_name'],
      avatarUrl: json['avatar_url'],
      avatarInitials: initials,
      isKnownCompany: json['is_known_company'] == true,
      isDispatchUser: json['is_dispatch_user'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'from': from,
      'to': to,
      'cc': cc,
      'bcc': bcc,
      'subject': subject,
      'body': body,
      'body_text': bodyText,
      'body_html': bodyHtml,
      'folder': folder,
      'is_read': isRead,
      'is_flagged': isFlagged,
      'is_important_sender': isImportantSender,
      'created_at': createdAt.toIso8601String(),
      'attachments': attachments.map((a) => a.toJson()).toList(),
      'has_attachments': hasAttachments,
      'sender_name': senderName,
      'avatar_url': avatarUrl,
      'avatar_initials': avatarInitials,
      'is_known_company': isKnownCompany,
      'is_dispatch_user': isDispatchUser,
    };
  }

  static String _extractInitials(String input) {
    if (input.isEmpty) return '??';
    final parts = input.trim().split(' ').where((s) => s.isNotEmpty).toList();
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return input.substring(0, input.length >= 2 ? 2 : 1).toUpperCase();
  }
}
