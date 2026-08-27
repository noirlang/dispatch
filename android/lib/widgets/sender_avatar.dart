import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class SenderAvatar extends StatelessWidget {
  final String? avatarUrl;
  final String initials;
  final String identifier;
  final bool isKnownCompany;
  final bool isDispatchUser;
  final double size;

  const SenderAvatar({
    super.key,
    this.avatarUrl,
    required this.initials,
    required this.identifier,
    this.isKnownCompany = false,
    this.isDispatchUser = false,
    this.size = 40,
  });

  String? _resolveUrl(String? url) {
    if (url == null || url.trim().isEmpty) return null;
    final trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    if (trimmed.startsWith('/')) {
      return '${ApiService.baseUrl}$trimmed';
    }
    return '${ApiService.baseUrl}/$trimmed';
  }

  @override
  Widget build(BuildContext context) {
    final resolved = _resolveUrl(avatarUrl);
    if (resolved != null && resolved.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(size / 2),
        child: Image.network(
          resolved,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildInitials(),
        ),
      );
    }
    return _buildInitials();
  }

  Widget _buildInitials() {
    final bgColor = _generateColor(identifier);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: bgColor.withOpacity(0.2),
        borderRadius: BorderRadius.circular(size / 2),
        border: Border.all(color: bgColor.withOpacity(0.4), width: 1),
      ),
      child: Center(
        child: Text(
          initials.isNotEmpty ? initials.toUpperCase() : '??',
          style: TextStyle(
            color: bgColor,
            fontSize: size * 0.38,
            fontWeight: FontWeight.bold,
            letterSpacing: -0.5,
          ),
        ),
      ),
    );
  }

  Color _generateColor(String str) {
    final hash = str.hashCode.abs();
    final colors = [
      AppTheme.blue,
      AppTheme.purple,
      AppTheme.green,
      AppTheme.amber,
      const Color(0xFF06B6D4), // Cyan
      const Color(0xFFEC4899), // Pink
      const Color(0xFFF97316), // Orange
      const Color(0xFF8B5CF6), // Indigo
    ];
    return colors[hash % colors.length];
  }
}
