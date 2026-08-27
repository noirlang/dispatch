import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../providers/email_provider.dart';
import '../providers/dashboard_provider.dart';
import '../providers/calendar_provider.dart';
import '../providers/rss_provider.dart';
import '../theme/app_theme.dart';
import 'email/email_list_view.dart';
import 'dashboard/dashboard_view.dart';
import 'calendar/calendar_view.dart';
import 'feed/feed_view.dart';
import 'settings/settings_view.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    // Initial fetch of data
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<EmailProvider>().fetchEmails('inbox');
      context.read<DashboardProvider>().fetchDashboardCards();
      context.read<CalendarProvider>().fetchEvents();
      context.read<RssProvider>().fetchFeedsAndItems();
    });
  }

  void _onTabSelected(int index) {
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    final emailProvider = context.watch<EmailProvider>();
    final approvalsBadge = emailProvider.approvalsCount;

    final screens = [
      EmailListView(onNavigateToTab: _onTabSelected),
      const DashboardView(),
      const CalendarView(),
      const FeedView(),
      const SettingsView(),
    ];

    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppTheme.bgSecondary,
          border: Border(
            top: BorderSide(color: AppTheme.borderColor, width: 0.8),
          ),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(0, LucideIcons.mail, 'Posta', badgeCount: approvalsBadge),
                _buildNavItem(1, LucideIcons.layoutDashboard, 'Pano'),
                _buildNavItem(2, LucideIcons.calendar, 'Takvim'),
                _buildNavItem(3, LucideIcons.rss, 'Akış'),
                _buildNavItem(4, LucideIcons.settings, 'Ayarlar'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label, {int badgeCount = 0}) {
    final isSelected = _currentIndex == index;
    return InkWell(
      onTap: () => _onTabSelected(index),
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.bgTertiary : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
          border: isSelected ? Border.all(color: AppTheme.borderColor, width: 1) : null,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  icon,
                  size: 20,
                  color: isSelected ? AppTheme.textPrimary : AppTheme.textMuted,
                ),
                if (badgeCount > 0)
                  Positioned(
                    right: -6,
                    top: -4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                      decoration: BoxDecoration(
                        color: AppTheme.blue,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                      child: Text(
                        '$badgeCount',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? AppTheme.textPrimary : AppTheme.textMuted,
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
