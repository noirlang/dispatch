import 'package:flutter/material.dart';
import '../models/rss_item.dart';
import '../services/api_service.dart';
import '../services/cache_service.dart';

class RssProvider extends ChangeNotifier {
  List<RssFeed> _feeds = [];
  List<RssItem> _items = [];
  int? _selectedFeedId;
  bool _isLoading = false;
  String? _errorMessage;

  List<RssFeed> get feeds => _feeds;
  List<RssItem> get items => _items;
  int? get selectedFeedId => _selectedFeedId;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  List<RssItem> get filteredItems {
    if (_selectedFeedId == null) return _items;
    return _items.where((i) => i.feedId == _selectedFeedId).toList();
  }

  void selectFeed(int? feedId) {
    _selectedFeedId = feedId;
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

  Future<void> refreshFeeds() async {
    _isLoading = true;
    notifyListeners();
    try {
      if (_selectedFeedId != null) {
        await ApiService.post('/rss/feeds/$_selectedFeedId/refresh');
      } else {
        for (final f in _feeds) {
          await ApiService.post('/rss/feeds/${f.id}/refresh');
        }
      }
    } catch (_) {}
    await fetchFeedsAndItems(forceRefresh: true);
  }

  Future<bool> addFeed(String url, {String? category, int? interval}) async {
    try {
      final res = await ApiService.post('/rss/feeds', body: {
        'url': url,
        if (category != null && category.isNotEmpty) 'category': category,
        'refresh_interval': interval ?? 15,
      });
      if (res is Map<String, dynamic>) {
        await fetchFeedsAndItems(forceRefresh: true);
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
