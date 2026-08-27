import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../providers/email_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/email_item_tile.dart';
import 'email_reader_view.dart';
import 'compose_view.dart';
import 'contacts_view.dart';

class EmailListView extends StatefulWidget {
  final Function(int)? onNavigateToTab;

  const EmailListView({super.key, this.onNavigateToTab});

  @override
  State<EmailListView> createState() => _EmailListViewState();
}

class _EmailListViewState extends State<EmailListView> {
  final _searchController = TextEditingController();
  bool _isSearching = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onFolderChange(String folder) {
    context.read<EmailProvider>().fetchEmails(folder);
  }

  @override
  Widget build(BuildContext context) {
    final emailProvider = context.watch<EmailProvider>();
    final currentFolder = emailProvider.currentFolder;

    // Filter by search query
    final query = _searchController.text.trim().toLowerCase();
    final emails = query.isEmpty
        ? emailProvider.emails
        : emailProvider.emails.where((e) {
            final from = e.from.toLowerCase();
            final subj = e.subject.toLowerCase();
            final body = (e.bodyText ?? '').toLowerCase();
            final name = (e.senderName ?? '').toLowerCase();
            return from.contains(query) || subj.contains(query) || body.contains(query) || name.contains(query);
          }).toList();

    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      appBar: AppBar(
        title: _isSearching
            ? TextField(
                controller: _searchController,
                autofocus: true,
                style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
                decoration: const InputDecoration(
                  hintText: 'E-postalarda ara...',
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: EdgeInsets.zero,
                ),
                onChanged: (_) => setState(() {}),
              )
            : Row(
                children: [
                  Image.asset(
                    'assets/dispatch.png',
                    height: 22,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(width: 10),
                  Text(_getFolderTitle(currentFolder)),
                ],
              ),
        actions: [
          IconButton(
            icon: Icon(_isSearching ? LucideIcons.x : LucideIcons.search, size: 18),
            onPressed: () {
              setState(() {
                if (_isSearching) {
                  _searchController.clear();
                  _isSearching = false;
                } else {
                  _isSearching = true;
                }
              });
            },
          ),
          IconButton(
            icon: const Icon(LucideIcons.users, size: 18),
            tooltip: 'Kişiler & Gruplar',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ContactsView()),
              );
            },
          ),
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18),
            tooltip: 'Yenile',
            onPressed: () => emailProvider.fetchEmails(currentFolder, forceRefresh: true),
          ),
          const SizedBox(width: 4),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'fab_compose',
        backgroundColor: AppTheme.accent,
        foregroundColor: AppTheme.accentInvert,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const ComposeView()),
          );
        },
        child: const Icon(LucideIcons.penTool, size: 20),
      ),
      body: Column(
        children: [
          // Folder Selector Pills
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _buildFolderPill('inbox', 'Gelen Kutusu', LucideIcons.inbox),
                const SizedBox(width: 8),
                _buildFolderPill(
                  'approvals',
                  'Onay Kuyruğu',
                  LucideIcons.userCheck,
                  badge: emailProvider.approvalsCount > 0 ? emailProvider.approvalsCount : null,
                ),
                const SizedBox(width: 8),
                _buildFolderPill('sent', 'Gönderilenler', LucideIcons.send),
                const SizedBox(width: 8),
                _buildFolderPill('drafts', 'Taslaklar', LucideIcons.fileText),
                const SizedBox(width: 8),
                _buildFolderPill('trash', 'Çöp Kutusu', LucideIcons.trash2),
                const SizedBox(width: 8),
                _buildFolderPill('contacts', 'Kişiler & Gruplar', LucideIcons.users),
              ],
            ),
          ),

          // Main Email List Area
          Expanded(
            child: RefreshIndicator(
              color: AppTheme.textPrimary,
              backgroundColor: AppTheme.bgSecondary,
              onRefresh: () => emailProvider.fetchEmails(currentFolder, forceRefresh: true),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  if (emailProvider.isLoading && emails.isEmpty) ...[
                    const SizedBox(height: 80),
                    const Center(
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.textMuted),
                    ),
                  ] else if (emails.isEmpty) ...[
                    const SizedBox(height: 80),
                    Center(
                      child: Column(
                        children: [
                          const Icon(LucideIcons.inbox, size: 40, color: AppTheme.textDim),
                          const SizedBox(height: 12),
                          Text(
                            _isSearching
                                ? 'Aramanızla eşleşen e-posta bulunamadı'
                                : 'Bu klasörde henüz e-posta yok',
                            style: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    ...emails.map((email) {
                      return Dismissible(
                        key: Key('email_${email.id}'),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 20),
                          color: AppTheme.red.withOpacity(0.8),
                          child: const Icon(LucideIcons.trash2, color: Colors.white, size: 20),
                        ),
                        onDismissed: (_) {
                          emailProvider.deleteEmail(email.id);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('E-posta çöp kutusuna taşındı'),
                              duration: Duration(seconds: 2),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                        child: EmailItemTile(
                          email: email,
                          onTap: () {
                            emailProvider.markAsRead(email.id);
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => EmailReaderView(emailId: email.id, initialEmail: email),
                              ),
                            );
                          },
                          onToggleFlag: () => emailProvider.toggleFlag(email.id),
                        ),
                      );
                    }),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFolderPill(String folderId, String label, IconData icon, {int? badge}) {
    final isSelected = context.watch<EmailProvider>().currentFolder == folderId;
    return InkWell(
      onTap: () {
        if (folderId == 'contacts') {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const ContactsView()),
          );
        } else {
          _onFolderChange(folderId);
        }
      },
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.accent : AppTheme.bgSecondary,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppTheme.accent : AppTheme.borderColor,
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 14,
              color: isSelected ? AppTheme.accentInvert : AppTheme.textMuted,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? AppTheme.accentInvert : AppTheme.textSecondary,
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              ),
            ),
            if (badge != null && badge > 0) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.black : AppTheme.blue,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$badge',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _getFolderTitle(String folder) {
    switch (folder) {
      case 'inbox':
        return 'Gelen Kutusu';
      case 'approvals':
        return 'Onay Kuyruğu';
      case 'sent':
        return 'Gönderilenler';
      case 'drafts':
        return 'Taslaklar';
      case 'trash':
        return 'Çöp Kutusu';
      default:
        return 'E-Posta';
    }
  }
}
