class ActionableItem {
  final String label;
  final String value;
  final bool copyable;
  final String? url;

  ActionableItem({
    required this.label,
    required this.value,
    this.copyable = true,
    this.url,
  });

  factory ActionableItem.fromJson(Map<String, dynamic> json) {
    return ActionableItem(
      label: json['label']?.toString() ?? '',
      value: json['value']?.toString() ?? '',
      copyable: json['copyable'] ?? true,
      url: json['url']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'label': label,
      'value': value,
      'copyable': copyable,
      'url': url,
    };
  }
}

class CalendarSuggestion {
  final String title;
  final String? date;
  final String? time;
  final bool allDay;
  final String? location;
  final String? description;

  CalendarSuggestion({
    required this.title,
    this.date,
    this.time,
    this.allDay = false,
    this.location,
    this.description,
  });

  factory CalendarSuggestion.fromJson(Map<String, dynamic> json) {
    return CalendarSuggestion(
      title: json['title'] ?? 'Etkinlik',
      date: json['date'],
      time: json['time'],
      allDay: json['all_day'] == true,
      location: json['location'],
      description: json['description'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'date': date,
      'time': time,
      'all_day': allDay,
      'location': location,
      'description': description,
    };
  }
}

class DashboardCard {
  final int id;
  final int? emailId;
  final String type; // travel, otp, tracking, invoice, ticket, bank, verification, order, meeting, general
  final String summary;
  final String? senderContext;
  final String priority; // high, medium, low
  final List<ActionableItem> actionableItems;
  final CalendarSuggestion? calendarSuggestion;
  final List<String> tags;
  final DateTime? expiresAt;
  final DateTime createdAt;

  DashboardCard({
    required this.id,
    this.emailId,
    required this.type,
    required this.summary,
    this.senderContext,
    this.priority = 'medium',
    this.actionableItems = const [],
    this.calendarSuggestion,
    this.tags = const [],
    this.expiresAt,
    required this.createdAt,
  });

  factory DashboardCard.fromJson(Map<String, dynamic> json) {
    var rawItems = json['actionable_items'];
    List<ActionableItem> items = [];
    if (rawItems is List) {
      items = rawItems
          .whereType<Map<String, dynamic>>()
          .map((i) => ActionableItem.fromJson(i))
          .toList();
    }

    CalendarSuggestion? suggestion;
    if (json['calendar_suggestion'] is Map<String, dynamic>) {
      suggestion = CalendarSuggestion.fromJson(json['calendar_suggestion']);
    }

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

    List<String> parsedTags = [];
    if (json['tags'] is List) {
      parsedTags = (json['tags'] as List).map((e) => e.toString()).toList();
    }

    return DashboardCard(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      emailId: json['email_id'],
      type: json['card_type'] ?? json['type'] ?? 'general',
      summary: json['summary'] ?? '',
      senderContext: json['sender_context'],
      priority: json['priority'] ?? 'medium',
      actionableItems: items,
      calendarSuggestion: suggestion,
      tags: parsedTags,
      expiresAt: exp,
      createdAt: created,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email_id': emailId,
      'type': type,
      'summary': summary,
      'sender_context': senderContext,
      'priority': priority,
      'actionable_items': actionableItems.map((i) => i.toJson()).toList(),
      'calendar_suggestion': calendarSuggestion?.toJson(),
      'tags': tags,
      'expires_at': expiresAt?.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
    };
  }

  int get priorityWeight {
    switch (type.toLowerCase()) {
      case 'travel':
        return 1;
      case 'otp':
      case 'verification':
        return 2;
      case 'tracking':
        return 3;
      case 'invoice':
      case 'bank':
        return 4;
      case 'meeting':
        return 5;
      default:
        return 6;
    }
  }
}
