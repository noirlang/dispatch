import 'package:flutter/material.dart';
import '../models/rss_item.dart';
import '../services/api_service.dart';
import '../services/cache_service.dart';

class RssProvider extends ChangeNotifier {
  List<RssFeed> _feeds = [];
  List<RssItem> _items = [];
  String _selectedCategory = 'Tümü';
  bool _isLoading = false;
  String? _errorMessage;

  List<RssFeed> get feeds => _feeds;
  List<RssItem> get items => _items;
  String get selectedCategory => _selectedCategory;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  List<String> get categories {
    final set = {'Tümü'};
    for (var f in _feeds) {
      if (f.category != null && f.category!.isNotEmpty) {
        set.add(f.category!);
      }
    }
    return set.toList();
  }

  List<RssItem> get filteredItems {
    if (_selectedCategory == 'Tümü') return _items;
    final categoryFeedIds = _feeds
        .where((f) => f.category == _selectedCategory)
        .map((f) => f.id)
        .toSet();
    return _items.where((i) => categoryFeedIds.contains(i.feedId)).toList();
  }

  void selectCategory(String cat) {
    _selectedCategory = cat;
    notifyListeners();
  }

  Future<void> fetchFeedsAndItems({bool forceRefresh = false}) async {
    _errorMessage = null;

    final cachedFeeds = await CacheService.getRssFeeds();
    final cachedItems = await CacheService.getRssItems();

    if (cachedFeeds != null && cachedItems != null && !forceRefresh) {
      _feeds = cachedFeeds
          .whereType<Map<String, dynamic>>()
          .map((j) => RssFeed.fromJson(j))
          .toList();
      _items = cachedItems
          .whereType<Map<String, dynamic>>()
          .map((j) => RssItem.fromJson(j))
          .toList();
      notifyListeners();
    } else {
      _isLoading = true;
      notifyListeners();
    }

    try {
      final resFeeds = await ApiService.get('/rss/feeds');
      if (resFeeds is List) {
        _feeds = resFeeds
            .whereType<Map<String, dynamic>>()
            .map((j) => RssFeed.fromJson(j))
            .toList();
        await CacheService.saveRssFeeds(resFeeds);
      }

      final resItems = await ApiService.get('/rss/items');
      if (resItems is List) {
        _items = resItems
            .whereType<Map<String, dynamic>>()
            .map((j) => RssItem.fromJson(j))
            .toList();
        _items.sort((a, b) => b.publishedAt.compareTo(a.publishedAt));
        await CacheService.saveRssItems(resItems);
      }
    } catch (e) {
      if (_items.isEmpty) {
        _errorMessage = e.toString();
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> markItemRead(int id) async {
    final idx = _items.indexWhere((i) => i.id == id);
    if (idx != -1 && !_items[idx].read) {
      _items[idx] = RssItem(
        id: _items[idx].id,
        feedId: _items[idx].feedId,
        feedTitle: _items[idx].feedTitle,
        feedFavicon: _items[idx].feedFavicon,
        guid: _items[idx].guid,
        title: _items[idx].title,
        content: _items[idx].content,
        url: _items[idx].url,
        author: _items[idx].author,
        publishedAt: _items[idx].publishedAt,
        read: true,
        starred: _items[idx].starred,
      );
      notifyListeners();

      try {
        await ApiService.patch('/rss/items/$id/read');
      } catch (_) {}
    }
  }

  Future<bool> addFeed(String url, {String? category, int? interval}) async {
    try {
      final res = await ApiService.post('/rss/feeds', body: {
        'url': url,
        'category': category ?? 'Genel',
        'refresh_interval': interval ?? 15,
      });
      if (res is Map<String, dynamic>) {
        fetchFeedsAndItems(forceRefresh: true);
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<bool> deleteFeed(int id) async {
    _feeds.removeWhere((f) => f.id == id);
    _items.removeWhere((i) => i.feedId == id);
    notifyListeners();

    try {
      await ApiService.delete('/rss/feeds/$id');
      return true;
    } catch (_) {
      return false;
    }
  }
}
