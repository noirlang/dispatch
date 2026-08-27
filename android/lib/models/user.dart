class User {
  final int id;
  final String email;
  final String? name;
  final String? avatarPath;
  final bool approvalSystemEnabled;
  final bool spyPixelBlocking;
  final bool aiConfigured;
  final String? activeAiProvider;
  final String? defaultSignature;
  final bool isTwoFactorEnabled;

  User({
    required this.id,
    required this.email,
    this.name,
    this.avatarPath,
    this.approvalSystemEnabled = true,
    this.spyPixelBlocking = true,
    this.aiConfigured = false,
    this.activeAiProvider,
    this.defaultSignature,
    this.isTwoFactorEnabled = false,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      email: json['email'] ?? '',
      name: json['name'],
      avatarPath: json['avatar_path'] ?? json['avatar_url'],
      approvalSystemEnabled: json['approval_system_enabled'] ?? true,
      spyPixelBlocking: json['spy_pixel_blocking'] ?? true,
      aiConfigured: json['ai_configured'] ?? false,
      activeAiProvider: json['active_ai_provider'],
      defaultSignature: json['default_signature'],
      isTwoFactorEnabled: json['is_two_factor_enabled'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'avatar_path': avatarPath,
      'approval_system_enabled': approvalSystemEnabled,
      'spy_pixel_blocking': spyPixelBlocking,
      'ai_configured': aiConfigured,
      'active_ai_provider': activeAiProvider,
      'default_signature': defaultSignature,
      'is_two_factor_enabled': isTwoFactorEnabled,
    };
  }
}

class ServerRegistrationStatus {
  final String registrationMode; // 'public', 'invite_only', 'admin_only'
  final bool isConfigured;
  final String? domain;
  final String? mailSubdomain;

  ServerRegistrationStatus({
    this.registrationMode = 'public',
    this.isConfigured = true,
    this.domain,
    this.mailSubdomain,
  });

  factory ServerRegistrationStatus.fromJson(Map<String, dynamic> json) {
    return ServerRegistrationStatus(
      registrationMode: json['registration_mode'] ?? json['mode'] ?? 'public',
      isConfigured: json['is_configured'] ?? true,
      domain: json['domain'],
      mailSubdomain: json['mail_subdomain'],
    );
  }
}
