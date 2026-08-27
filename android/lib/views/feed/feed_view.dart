import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/rss_item.dart';
import '../../providers/rss_provider.dart';
import '../../theme/app_theme.dart';

class FeedView extends StatelessWidget {
  const FeedView({super.key});

  void _showAddFeedModal(BuildContext context) {
    final urlController = TextEditingController();
    final categoryController = TextEditingController(text: 'Teknoloji');

    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.bgSecondary,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          left: 20,
          right: 20,
          top: 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Yeni RSS Kaynağı Ekle',
                  style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(LucideIcons.x, size: 18),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: urlController,
              keyboardType: TextInputType.url,
              style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
              decoration: const InputDecoration(labelText: 'RSS URL Adresi', hintText: 'https://site.com/feed.xml'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: categoryController,
              style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
              decoration: const InputDecoration(labelText: 'Kategori', hintText: 'Teknoloji, Haberler vb.'),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accent,
                foregroundColor: AppTheme.accentInvert,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              onPressed: () async {
                if (urlController.text.trim().isEmpty) return;
                await context.read<RssProvider>().addFeed(
                  urlController.text.trim(),
                  category: categoryController.text.trim(),
                );
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: const Text('Kaynağı Ekle', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final rss = context.watch<RssProvider>();
    final categories = rss.categories;
    final items = rss.filteredItems;

    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(LucideIcons.rss, size: 18, color: AppTheme.amber),
            SizedBox(width: 8),
            Text('RSS Akışı'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.plus, size: 20),
            onPressed: () => _showAddFeedModal(context),
          ),
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18),
            onPressed: () => rss.fetchFeedsAndItems(forceRefresh: true),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          // Categories Filter Bar
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: categories.map((cat) {
                final isSelected = rss.selectedCategory == cat;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: InkWell(
                    onTap: () => rss.selectCategory(cat),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: isSelected ? AppTheme.accent : AppTheme.bgSecondary,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isSelected ? AppTheme.accent : AppTheme.borderColor),
                      ),
                      child: Text(
                        cat,
                        style: TextStyle(
                          color: isSelected ? AppTheme.accentInvert : AppTheme.textSecondary,
                          fontSize: 12,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          // Main Items List
          Expanded(
            child: RefreshIndicator(
              color: AppTheme.textPrimary,
              backgroundColor: AppTheme.bgSecondary,
              onRefresh: () => rss.fetchFeedsAndItems(forceRefresh: true),
              child: items.isEmpty && !rss.isLoading
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: AppTheme.bgSecondary,
                              shape: BoxShape.circle,
                              border: Border.all(color: AppTheme.borderColor),
                            ),
                            child: const Icon(LucideIcons.rss, size: 36, color: AppTheme.textDim),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Akış Henüz Boş',
                            style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Sağ üstteki + butonuna basarak takip etmek istediğiniz\nRSS kaynaklarını ekleyebilirsiniz.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppTheme.textMuted, fontSize: 12, height: 1.4),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      itemCount: items.length,
                      itemBuilder: (ctx, idx) {
                        final item = items[idx];
                        return _buildFeedItemTile(context, item, idx);
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeedItemTile(BuildContext context, RssItem item, int index) {
    return InkWell(
      onTap: () {
        context.read<RssProvider>().markItemRead(item.id);
        if (item.url != null && item.url!.isNotEmpty) {
          launchUrl(Uri.parse(item.url!), mode: LaunchMode.externalApplication);
        }
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: item.read ? AppTheme.bgSecondary.withOpacity(0.5) : AppTheme.bgSecondary,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.borderColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top feed metadata row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    if (!item.read)
                      Container(
                        width: 6,
                        height: 6,
                        margin: const EdgeInsets.only(right: 6),
                        decoration: const BoxDecoration(color: AppTheme.amber, shape: BoxShape.circle),
                      ),
                    Text(
                      item.feedTitle ?? 'RSS',
                      style: const TextStyle(color: AppTheme.amber, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                Text(
                  DateFormat('d MMM, HH:mm', 'tr').format(item.publishedAt),
                  style: const TextStyle(color: AppTheme.textDim, fontSize: 11),
                ),
              ],
            ),
            const SizedBox(height: 6),

            // Title
            Text(
              item.title,
              style: TextStyle(
                color: item.read ? AppTheme.textSecondary : AppTheme.textPrimary,
                fontSize: 14,
                fontWeight: item.read ? FontWeight.w500 : FontWeight.bold,
                height: 1.3,
              ),
            ),

            if (item.content != null && item.content!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                item.content!.replaceAll(RegExp(r'<[^>]*>|&[^;]+;'), '').trim(),
                style: const TextStyle(color: AppTheme.textMuted, fontSize: 12, height: 1.3),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
      ),
    ).animate().fadeIn(delay: (index * 40).ms);
  }
}
