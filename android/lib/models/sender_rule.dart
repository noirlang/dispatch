class SenderRule {
  final int id;
  final String emailAddress;
  final String? domain;
  final String status; // approved, blocked, important
  final DateTime? approvedAt;

  SenderRule({
    required this.id,
    required this.emailAddress,
    this.domain,
    required this.status,
    this.approvedAt,
  });

  factory SenderRule.fromJson(Map<String, dynamic> json) {
    DateTime? app;
    if (json['approved_at'] != null) {
      try {
        app = DateTime.parse(json['approved_at']);
      } catch (_) {}
    }

    return SenderRule(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      emailAddress: json['email_address'] ?? json['email'] ?? '',
      domain: json['domain'],
      status: json['status'] ?? 'approved',
      approvedAt: app,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email_address': emailAddress,
      'domain': domain,
      'status': status,
      'approved_at': approvedAt?.toIso8601String(),
    };
  }
}

class SpeakeasyCode {
  final int id;
  final String code;
  final String? label;
  final DateTime? expiresAt;
  final bool singleUse;
  final bool used;
  final DateTime createdAt;

  SpeakeasyCode({
    required this.id,
    required this.code,
    this.label,
    this.expiresAt,
    this.singleUse = false,
    this.used = false,
    required this.createdAt,
  });

  factory SpeakeasyCode.fromJson(Map<String, dynamic> json) {
    DateTime? exp;
    if (json['expires_at'] != null) {
      try {
        exp = DateTime.parse(json['expires_at']);
      } catch (_) {}
    }

    DateTime created;
    try {
      created = DateTime.parse(json['created_at'] ?? DateTime.now().toIso8601String());
    } catch (_) {
      created = DateTime.now();
    }

    return SpeakeasyCode(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      code: json['code'] ?? '',
      label: json['label'],
      expiresAt: exp,
      singleUse: json['single_use'] == true,
      used: json['used'] == true,
      createdAt: created,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'label': label,
      'expires_at': expiresAt?.toIso8601String(),
      'single_use': singleUse,
      'used': used,
      'created_at': createdAt.toIso8601String(),
    };
  }

  bool get isExpired {
    if (expiresAt == null) return false;
    return DateTime.now().isAfter(expiresAt!);
  }
}
