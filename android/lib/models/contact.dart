class EmailContact {
  final String email;
  final String name;
  final String? avatarUrl;
  final String? initials;
  final String status; // 'approved', 'important', 'blocked'
  final bool isImportant;
  final bool isBlocked;
  final int emailsCount;
  final DateTime? lastContactAt;

  EmailContact({
    required this.email,
    required this.name,
    this.avatarUrl,
    this.initials,
    this.status = 'approved',
    this.isImportant = false,
    this.isBlocked = false,
    this.emailsCount = 0,
    this.lastContactAt,
  });

  factory EmailContact.fromJson(Map<String, dynamic> json) {
    DateTime? last;
    if (json['last_contact_at'] != null) {
      try {
        last = DateTime.parse(json['last_contact_at']);
      } catch (_) {}
    }

    final statusVal = json['status']?.toString() ?? 'approved';
    return EmailContact(
      email: json['email'] ?? '',
      name: (json['name'] != null && json['name'].toString().isNotEmpty)
          ? json['name']
          : (json['email'] ?? '').toString().split('@').first,
      avatarUrl: json['avatar_url'],
      initials: json['initials'] ?? (json['name'] != null && json['name'].toString().isNotEmpty ? json['name'][0] : '?'),
      status: statusVal,
      isImportant: json['is_important'] == true || statusVal == 'important',
      isBlocked: json['is_blocked'] == true || statusVal == 'blocked',
      emailsCount: json['emails_count'] is int ? json['emails_count'] : int.tryParse(json['emails_count'].toString()) ?? 0,
      lastContactAt: last,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'email': email,
      'name': name,
      'avatar_url': avatarUrl,
      'initials': initials,
      'status': status,
      'is_important': isImportant,
      'is_blocked': isBlocked,
      'emails_count': emailsCount,
      'last_contact_at': lastContactAt?.toIso8601String(),
    };
  }
}

class ContactGroup {
  final int id;
  final String name;
  final String alias;
  final String? description;
  final String? color;
  final List<String> members;
  final int memberCount;
  final DateTime? createdAt;

  ContactGroup({
    required this.id,
    required this.name,
    required this.alias,
    this.description,
    this.color,
    this.members = const [],
    this.memberCount = 0,
    this.createdAt,
  });

  factory ContactGroup.fromJson(Map<String, dynamic> json) {
    List<String> parsedMembers = [];
    if (json['members'] is List) {
      parsedMembers = (json['members'] as List).map((e) => e.toString().trim()).where((e) => e.isNotEmpty).toList();
    }

    DateTime? created;
    if (json['created_at'] != null) {
      try {
        created = DateTime.parse(json['created_at']);
      } catch (_) {}
    }

    return ContactGroup(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      name: json['name'] ?? '',
      alias: json['alias'] ?? (json['name'] ?? '').toString().toLowerCase().replaceAll(' ', ''),
      description: json['description'],
      color: json['color'] ?? '#3b82f6',
      members: parsedMembers,
      memberCount: json['member_count'] is int ? json['member_count'] : parsedMembers.length,
      createdAt: created,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'alias': alias,
      'description': description,
      'color': color,
      'members': members,
      'member_count': memberCount,
      'created_at': createdAt?.toIso8601String(),
    };
  }
}
