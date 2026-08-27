class CalendarEvent {
  final int id;
  final String title;
  final String? description;
  final String? location;
  final DateTime startsAt;
  final DateTime? endsAt;
  final bool allDay;
  final String source; // manual, ai_extracted, email
  final String? color;
  final int? emailId;
  final List<String> attendees;

  CalendarEvent({
    required this.id,
    required this.title,
    this.description,
    this.location,
    required this.startsAt,
    this.endsAt,
    this.allDay = false,
    this.source = 'manual',
    this.color,
    this.emailId,
    this.attendees = const [],
  });

  factory CalendarEvent.fromJson(Map<String, dynamic> json) {
    DateTime start;
    try {
      start = DateTime.parse(json['starts_at'] ?? json['start_time'] ?? DateTime.now().toIso8601String());
    } catch (_) {
      start = DateTime.now();
    }

    DateTime? end;
    if (json['ends_at'] != null || json['end_time'] != null) {
      try {
        end = DateTime.parse(json['ends_at'] ?? json['end_time']);
      } catch (_) {}
    }

    List<String> parsedAttendees = [];
    if (json['attendees'] is List) {
      parsedAttendees = (json['attendees'] as List).map((e) => e.toString()).toList();
    }

    return CalendarEvent(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      title: json['title'] ?? '(İsimsiz Etkinlik)',
      description: json['description'],
      location: json['location'],
      startsAt: start,
      endsAt: end,
      allDay: json['all_day'] == true,
      source: json['source'] ?? 'manual',
      color: json['color'],
      emailId: json['email_id'],
      attendees: parsedAttendees,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'location': location,
      'starts_at': startsAt.toIso8601String(),
      'ends_at': endsAt?.toIso8601String(),
      'all_day': allDay,
      'source': source,
      'color': color,
      'email_id': emailId,
      'attendees': attendees,
    };
  }
}
