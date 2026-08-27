import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../providers/dashboard_provider.dart';
import '../providers/email_provider.dart';
import '../providers/calendar_provider.dart';
import '../theme/app_theme.dart';

class IosQuickWidget extends StatelessWidget {
  final VoidCallback? onApprovalsTap;
  final VoidCallback? onCalendarTap;

  const IosQuickWidget({
    super.key,
    this.onApprovalsTap,
    this.onCalendarTap,
  });

  @override
  Widget build(BuildContext context) {
    final dashboard = context.watch<DashboardProvider>();
    final emailProvider = context.watch<EmailProvider>();
    final calendarProvider = context.watch<CalendarProvider>();

    // 1. Check if there is an active OTP card
    final otpCard = dashboard.cards.cast<dynamic>().firstWhere(
      (c) => c.type == 'otp' || c.type == 'verification',
      orElse: () => null,
    );

    // 2. Check if there are approvals pending
    final approvalsCount = emailProvider.approvalsCount;

    // 3. Check nearest calendar event today
    final now = DateTime.now();
    final todayEvents = calendarProvider.events.where((e) {
      return e.startsAt.year == now.year &&
          e.startsAt.month == now.month &&
          e.startsAt.day == now.day &&
          e.startsAt.isAfter(now.subtract(const Duration(minutes: 30)));
    }).toList();

    final nextEvent = todayEvents.isNotEmpty ? todayEvents.first : null;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgSecondary,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppTheme.borderColor, width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.4),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 7,
                    height: 7,
                    decoration: const BoxDecoration(
                      color: AppTheme.green,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'DISPATCH LIVE',
                    style: TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.8,
                    ),
                  ),
                ],
              ),
              const Icon(LucideIcons.sparkles, size: 14, color: AppTheme.textMuted),
            ],
          ),
          const SizedBox(height: 12),

          // Content based on live priority
          if (otpCard != null && otpCard.actionableItems.isNotEmpty) ...[
            _buildOtpWidget(context, otpCard),
          ] else if (approvalsCount > 0) ...[
            _buildApprovalsWidget(context, approvalsCount),
          ] else if (nextEvent != null) ...[
            _buildCalendarWidget(context, nextEvent),
          ] else ...[
            _buildDefaultStatusWidget(),
          ],
        ],
      ),
    );
  }

  Widget _buildOtpWidget(BuildContext context, dynamic card) {
    final otpItem = card.actionableItems.first;
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppTheme.amber.withOpacity(0.15),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.amber.withOpacity(0.3)),
          ),
          child: const Icon(LucideIcons.key, color: AppTheme.amber, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                card.summary.isNotEmpty ? card.summary : 'Doğrulama Kodu',
                style: const TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              Text(
                otpItem.value,
                style: const TextStyle(
                  color: AppTheme.amber,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 2,
                  fontFamily: 'monospace',
                ),
              ),
            ],
          ),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.amber,
            foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          onPressed: () {
            Clipboard.setData(ClipboardData(text: otpItem.value));
            HapticFeedback.mediumImpact();
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('${otpItem.value} kopyalandı!'),
                duration: const Duration(seconds: 2),
                behavior: SnackBarBehavior.floating,
              ),
            );
          },
          child: const Text('Kopyala', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }

  Widget _buildApprovalsWidget(BuildContext context, int count) {
    return InkWell(
      onTap: onApprovalsTap,
      borderRadius: BorderRadius.circular(12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppTheme.blue.withOpacity(0.15),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppTheme.blue.withOpacity(0.3)),
            ),
            child: const Icon(LucideIcons.userCheck, color: AppTheme.blue, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Onay Kuyruğu',
                  style: TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  '$count yeni gönderici onayınızı bekliyor',
                  style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                ),
              ],
            ),
          ),
          const Icon(LucideIcons.chevronRight, color: AppTheme.textMuted, size: 18),
        ],
      ),
    );
  }

  Widget _buildCalendarWidget(BuildContext context, dynamic event) {
    final timeStr = '${event.startsAt.hour.toString().padLeft(2, '0')}:${event.startsAt.minute.toString().padLeft(2, '0')}';
    return InkWell(
      onTap: onCalendarTap,
      borderRadius: BorderRadius.circular(12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppTheme.green.withOpacity(0.15),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppTheme.green.withOpacity(0.3)),
            ),
            child: const Icon(LucideIcons.calendar, color: AppTheme.green, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.title,
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  'Bugün, saat $timeStr ${event.location != null ? '· ${event.location}' : ''}',
                  style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                ),
              ],
            ),
          ),
          const Icon(LucideIcons.chevronRight, color: AppTheme.textMuted, size: 18),
        ],
      ),
    );
  }

  Widget _buildDefaultStatusWidget() {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppTheme.bgTertiary,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.borderColor),
          ),
          child: const Icon(LucideIcons.shieldCheck, color: AppTheme.green, size: 20),
        ),
        const SizedBox(width: 12),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Gelen Kutusu Güvenli',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                'Spy pixel koruması ve onay sistemi aktif',
                style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
