import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/dashboard_card.dart';
import '../../providers/dashboard_provider.dart';
import '../../providers/calendar_provider.dart';
import '../../theme/app_theme.dart';

class DashboardView extends StatelessWidget {
  const DashboardView({super.key});

  @override
  Widget build(BuildContext context) {
    final dashboard = context.watch<DashboardProvider>();
    final cards = dashboard.cards;

    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(LucideIcons.sparkles, size: 18, color: AppTheme.blue),
            SizedBox(width: 8),
            Text('Yapay Zeka Panosu'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18),
            onPressed: () => dashboard.fetchDashboardCards(forceRefresh: true),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.textPrimary,
        backgroundColor: AppTheme.bgSecondary,
        onRefresh: () => dashboard.fetchDashboardCards(forceRefresh: true),
        child: cards.isEmpty && !dashboard.isLoading
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
                      child: const Icon(LucideIcons.sparkles, size: 36, color: AppTheme.textDim),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Pano Temiz',
                      style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Gelen e-postalardan tespit edilen kargo, OTP, fatura\nve seyahat kartları burada listelenir.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppTheme.textMuted, fontSize: 12, height: 1.4),
                    ),
                  ],
                ),
              )
            : ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                itemCount: cards.length,
                itemBuilder: (ctx, idx) {
                  final card = cards[idx];
                  return _buildCardItem(context, card, idx);
                },
              ),
      ),
    );
  }

  Widget _buildCardItem(BuildContext context, DashboardCard card, int index) {
    final typeConfig = _getTypeConfig(card.type);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgSecondary,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: typeConfig.color.withOpacity(0.3), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: typeConfig.color.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(typeConfig.icon, size: 16, color: typeConfig.color),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    typeConfig.label.toUpperCase(),
                    style: TextStyle(
                      color: typeConfig.color,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(LucideIcons.x, size: 14, color: AppTheme.textDim),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                onPressed: () {
                  context.read<DashboardProvider>().dismissCard(card.id);
                },
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Summary Text
          Text(
            card.summary,
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 14,
              fontWeight: FontWeight.w600,
              height: 1.4,
            ),
          ),

          if (card.senderContext != null) ...[
            const SizedBox(height: 4),
            Text(
              card.senderContext!,
              style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
            ),
          ],

          // Actionable Items List (Copyable OTP, Tracking link etc.)
          if (card.actionableItems.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: card.actionableItems.map((item) {
                return InkWell(
                  onTap: () {
                    if (item.url != null && item.url!.isNotEmpty) {
                      launchUrl(Uri.parse(item.url!), mode: LaunchMode.externalApplication);
                    } else if (item.copyable) {
                      Clipboard.setData(ClipboardData(text: item.value));
                      HapticFeedback.mediumImpact();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('${item.label}: ${item.value} kopyalandı!'),
                          duration: const Duration(seconds: 2),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    }
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width - 70,
                    ),
                    decoration: BoxDecoration(
                      color: AppTheme.bgTertiary,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppTheme.borderColor),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '${item.label}: ',
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                        ),
                        Flexible(
                          child: Text(
                            item.value,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: item.url != null ? AppTheme.blue : AppTheme.textPrimary,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              fontFamily: card.type == 'otp' ? 'monospace' : null,
                            ),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(
                          item.url != null ? LucideIcons.externalLink : LucideIcons.copy,
                          size: 12,
                          color: AppTheme.textMuted,
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ],

          // Calendar Suggestion Banner & Action
          if (card.calendarSuggestion != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.bgTertiary,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.borderColor),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.calendar, size: 16, color: AppTheme.green),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          card.calendarSuggestion!.title,
                          style: const TextStyle(color: AppTheme.textPrimary, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                        if (card.calendarSuggestion!.date != null)
                          Text(
                            '${card.calendarSuggestion!.date} ${card.calendarSuggestion!.time ?? ""}',
                            style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.green,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      minimumSize: Size.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: () async {
                      final ok = await context.read<DashboardProvider>().addToCalendar(card.id);
                      if (context.mounted) {
                        if (ok) {
                          context.read<CalendarProvider>().fetchEvents(forceRefresh: true);
                        }
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(ok ? 'Etkinlik takvime eklendi! 📅' : 'İşlem tamamlandı'),
                            backgroundColor: AppTheme.green,
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      }
                    },
                    child: const Text('Takvime Ekle', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    ).animate().fadeIn(delay: (index * 60).ms).slideY(begin: 0.05);
  }

  _CardTypeConfig _getTypeConfig(String type) {
    switch (type.toLowerCase()) {
      case 'travel':
        return _CardTypeConfig(icon: LucideIcons.plane, label: 'Seyahat & Uçuş', color: AppTheme.red);
      case 'otp':
      case 'verification':
        return _CardTypeConfig(icon: LucideIcons.key, label: 'Doğrulama Kodu', color: AppTheme.amber);
      case 'tracking':
        return _CardTypeConfig(icon: LucideIcons.package, label: 'Kargo Takip', color: AppTheme.amber);
      case 'invoice':
      case 'bank':
        return _CardTypeConfig(icon: LucideIcons.receipt, label: 'Fatura & Banka', color: AppTheme.blue);
      case 'meeting':
        return _CardTypeConfig(icon: LucideIcons.users, label: 'Toplantı Önerisi', color: AppTheme.green);
      default:
        return _CardTypeConfig(icon: LucideIcons.sparkles, label: 'Özet', color: AppTheme.purple);
    }
  }
}

class _CardTypeConfig {
  final IconData icon;
  final String label;
  final Color color;

  _CardTypeConfig({required this.icon, required this.label, required this.color});
}
