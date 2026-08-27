class RssFeed {
  final int id;
  final String url;
  final String? title;
  final String? description;
  final String? faviconUrl;
  final String? category;
  final int refreshInterval;
  final DateTime? lastFetchedAt;
  final int unreadCount;

  RssFeed({
    required this.id,
    required this.url,
    this.title,
    this.description,
    this.faviconUrl,
    this.category,
    this.refreshInterval = 15,
    this.lastFetchedAt,
    this.unreadCount = 0,
  });

  factory RssFeed.fromJson(Map<String, dynamic> json) {
    DateTime? last;
    if (json['last_fetched_at'] != null) {
      try {
        last = DateTime.parse(json['last_fetched_at']);
      } catch (_) {}
    }

    return RssFeed(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      url: json['url'] ?? '',
      title: json['title'] ?? 'RSS Kaynağı',
      description: json['description'],
      faviconUrl: json['favicon_url'],
      category: json['category'] ?? 'Genel',
      refreshInterval: json['refresh_interval'] ?? 15,
      lastFetchedAt: last,
      unreadCount: json['unread_count'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'url': url,
      'title': title,
      'description': description,
      'favicon_url': faviconUrl,
      'category': category,
      'refresh_interval': refreshInterval,
      'last_fetched_at': lastFetchedAt?.toIso8601String(),
      'unread_count': unreadCount,
    };
  }
}

class RssItem {
  final int id;
  final int? feedId;
  final String? feedTitle;
  final String? feedFavicon;
  final String guid;
  final String title;
  final String? content;
  final String? url;
  final String? author;
  final DateTime publishedAt;
  final bool read;
  final bool starred;

  RssItem({
    required this.id,
    this.feedId,
    this.feedTitle,
    this.feedFavicon,
    required this.guid,
    required this.title,
    this.content,
    this.url,
    this.author,
    required this.publishedAt,
    this.read = false,
    this.starred = false,
  });

  factory RssItem.fromJson(Map<String, dynamic> json) {
    DateTime pub;
    try {
      pub = DateTime.parse(json['published_at'] ?? DateTime.now().toIso8601String());
    } catch (_) {
      pub = DateTime.now();
    }

    return RssItem(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      feedId: json['rss_feed_id'] ?? json['feed_id'],
      feedTitle: json['feed_title'],
      feedFavicon: json['feed_favicon_url'],
      guid: json['guid'] ?? json['id'].toString(),
      title: json['title'] ?? '(Başlıksız Makale)',
      content: json['content'] ?? json['description'],
      url: json['url'] ?? json['link'],
      author: json['author'],
      publishedAt: pub,
      read: json['read'] == true || json['is_read'] == true,
      starred: json['starred'] == true || json['is_starred'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'feed_id': feedId,
      'feed_title': feedTitle,
      'feed_favicon_url': feedFavicon,
      'guid': guid,
      'title': title,
      'content': content,
      'url': url,
      'author': author,
      'published_at': publishedAt.toIso8601String(),
      'read': read,
      'starred': starred,
    };
  }
}
