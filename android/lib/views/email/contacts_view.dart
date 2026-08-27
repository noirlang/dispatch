import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../models/contact.dart';
import '../../providers/contacts_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/sender_avatar.dart';
import 'compose_view.dart';

class ContactsView extends StatefulWidget {
  const ContactsView({super.key});

  @override
  State<ContactsView> createState() => _ContactsViewState();
}

class _ContactsViewState extends State<ContactsView> {
  int _selectedTab = 0; // 0: Kişiler, 1: Gruplar
  String _contactFilter = 'all'; // 'all', 'important', 'blocked'
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ContactsProvider>().fetchAll();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showAddContactModal(BuildContext context) {
    final emailController = TextEditingController();
    String selectedStatus = 'approved';

    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.bgSecondary,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
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
                    'Yeni Kişi Ekle',
                    style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.x, size: 18),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              TextField(
                controller: emailController,
                keyboardType: TextInputType.emailAddress,
                style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
                decoration: const InputDecoration(
                  labelText: 'E-posta Adresi',
                  hintText: 'ornek@domain.com veya @sirket.com',
                ),
              ),
              const SizedBox(height: 14),
              const Text('KİŞİ DURUMU', style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Row(
                children: [
                  _buildStatusChoiceChip('Onaylı', 'approved', selectedStatus, (s) => setModalState(() => selectedStatus = s)),
                  const SizedBox(width: 8),
                  _buildStatusChoiceChip('Önemli ⭐', 'important', selectedStatus, (s) => setModalState(() => selectedStatus = s)),
                  const SizedBox(width: 8),
                  _buildStatusChoiceChip('Engelli 🚫', 'blocked', selectedStatus, (s) => setModalState(() => selectedStatus = s)),
                ],
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.accent,
                  foregroundColor: AppTheme.accentInvert,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () async {
                  if (emailController.text.trim().isEmpty) return;
                  await context.read<ContactsProvider>().addContact(
                    emailController.text.trim(),
                    status: selectedStatus,
                  );
                  if (ctx.mounted) Navigator.pop(ctx);
                },
                child: const Text('Kişiyi Kaydet', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showCreateGroupModal(BuildContext context) {
    final nameController = TextEditingController();
    final aliasController = TextEditingController();
    final descController = TextEditingController();
    final membersController = TextEditingController();

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
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Yeni İletişim Grubu Oluştur',
                    style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.x, size: 18),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              TextField(
                controller: nameController,
                style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
                decoration: const InputDecoration(labelText: 'Grup Adı', hintText: 'Örn: Yazılım Ekibi'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: aliasController,
                style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontFamily: 'monospace'),
                decoration: const InputDecoration(labelText: 'Grup Kısaltması / Takma Ad', hintText: 'yazilim (@yazilim)'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descController,
                style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13),
                decoration: const InputDecoration(labelText: 'Açıklama (İsteğe bağlı)', hintText: 'Frontend & Backend ekibi'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: membersController,
                maxLines: 2,
                style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13),
                decoration: const InputDecoration(
                  labelText: 'Üyeler (Virgülle ayırın)',
                  hintText: 'ali@sirket.com, veli@sirket.com',
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.accent,
                  foregroundColor: AppTheme.accentInvert,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () async {
                  if (nameController.text.trim().isEmpty) return;
                  final rawMembers = membersController.text.split(RegExp(r'[,;\n]'));
                  final members = rawMembers.map((m) => m.trim()).where((m) => m.isNotEmpty).toList();

                  await context.read<ContactsProvider>().createGroup(
                    name: nameController.text.trim(),
                    alias: aliasController.text.trim().isNotEmpty ? aliasController.text.trim() : nameController.text.trim().toLowerCase().replaceAll(' ', ''),
                    description: descController.text.trim().isNotEmpty ? descController.text.trim() : null,
                    members: members,
                  );
                  if (ctx.mounted) Navigator.pop(ctx);
                },
                child: const Text('Grubu Oluştur', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showAddMemberModal(BuildContext context, ContactGroup group) {
    final emailController = TextEditingController();

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
                Text(
                  '${group.name} Grubuna Üye Ekle',
                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 15, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(LucideIcons.x, size: 18),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const SizedBox(height: 14),
            TextField(
              controller: emailController,
              keyboardType: TextInputType.emailAddress,
              autofocus: true,
              style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
              decoration: const InputDecoration(labelText: 'E-posta Adresi', hintText: 'ornek@domain.com'),
            ),
            const SizedBox(height: 18),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accent,
                foregroundColor: AppTheme.accentInvert,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              onPressed: () async {
                if (emailController.text.trim().isEmpty) return;
                await context.read<ContactsProvider>().addMemberToGroup(group.id, emailController.text.trim());
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: const Text('Üyeyi Ekle', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChoiceChip(String label, String value, String current, Function(String) onSelect) {
    final isSelected = current == value;
    return Expanded(
      child: InkWell(
        onTap: () => onSelect(value),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.accent : AppTheme.bgTertiary,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: isSelected ? AppTheme.accent : AppTheme.borderColor),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? AppTheme.accentInvert : AppTheme.textSecondary,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ContactsProvider>();
    final query = _searchController.text.trim().toLowerCase();

    // Filter contacts
    final filteredContacts = provider.contacts.where((c) {
      final matchSearch = query.isEmpty ||
          c.name.toLowerCase().contains(query) ||
          c.email.toLowerCase().contains(query);
      if (!matchSearch) return false;

      if (_contactFilter == 'important') return c.isImportant;
      if (_contactFilter == 'blocked') return c.isBlocked;
      return true;
    }).toList();

    // Filter groups
    final filteredGroups = provider.groups.where((g) {
      if (query.isEmpty) return true;
      return g.name.toLowerCase().contains(query) ||
          g.alias.toLowerCase().contains(query) ||
          g.members.any((m) => m.toLowerCase().contains(query));
    }).toList();

    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      appBar: AppBar(
        title: const Text('Kişiler & Gruplar'),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.plus, size: 20),
            tooltip: _selectedTab == 0 ? 'Kişi Ekle' : 'Grup Oluştur',
            onPressed: () {
              if (_selectedTab == 0) {
                _showAddContactModal(context);
              } else {
                _showCreateGroupModal(context);
              }
            },
          ),
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18),
            tooltip: 'Yenile',
            onPressed: () => provider.fetchAll(forceRefresh: true),
          ),
          const SizedBox(width: 4),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.accent,
        foregroundColor: AppTheme.accentInvert,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        onPressed: () {
          if (_selectedTab == 0) {
            _showAddContactModal(context);
          } else {
            _showCreateGroupModal(context);
          }
        },
        child: Icon(_selectedTab == 0 ? LucideIcons.userPlus : LucideIcons.users, size: 20),
      ),
      body: Column(
        children: [
          // Segmented Tabs: Kişiler vs Gruplar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: AppTheme.bgSecondary,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.borderColor),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _selectedTab = 0),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: _selectedTab == 0 ? AppTheme.bgTertiary : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                          border: _selectedTab == 0 ? Border.all(color: AppTheme.borderColor) : null,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(LucideIcons.users, size: 16, color: _selectedTab == 0 ? AppTheme.textPrimary : AppTheme.textMuted),
                            const SizedBox(width: 8),
                            Text(
                              'Kişiler (${provider.contacts.length})',
                              style: TextStyle(
                                color: _selectedTab == 0 ? AppTheme.textPrimary : AppTheme.textMuted,
                                fontSize: 13,
                                fontWeight: _selectedTab == 0 ? FontWeight.bold : FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _selectedTab = 1),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: _selectedTab == 1 ? AppTheme.bgTertiary : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                          border: _selectedTab == 1 ? Border.all(color: AppTheme.borderColor) : null,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(LucideIcons.usersRound, size: 16, color: _selectedTab == 1 ? AppTheme.textPrimary : AppTheme.textMuted),
                            const SizedBox(width: 8),
                            Text(
                              'Gruplar (${provider.groups.length})',
                              style: TextStyle(
                                color: _selectedTab == 1 ? AppTheme.textPrimary : AppTheme.textMuted,
                                fontSize: 13,
                                fontWeight: _selectedTab == 1 ? FontWeight.bold : FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Search Field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: TextField(
              controller: _searchController,
              onChanged: (_) => setState(() {}),
              style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13),
              decoration: InputDecoration(
                hintText: _selectedTab == 0 ? 'Kişilerde ara...' : 'Gruplarda ara...',
                prefixIcon: const Icon(LucideIcons.search, size: 16, color: AppTheme.textDim),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(LucideIcons.x, size: 14),
                        onPressed: () {
                          _searchController.clear();
                          setState(() {});
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
              ),
            ),
          ),

          // Contacts Filter Sub-Pills (Only when tab 0)
          if (_selectedTab == 0)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Row(
                children: [
                  _buildFilterPill('all', 'Tümü'),
                  const SizedBox(width: 8),
                  _buildFilterPill('important', 'Önemli ⭐'),
                  const SizedBox(width: 8),
                  _buildFilterPill('blocked', 'Engellenenler 🚫'),
                ],
              ),
            ),

          // Main Content Area
          Expanded(
            child: RefreshIndicator(
              color: AppTheme.textPrimary,
              backgroundColor: AppTheme.bgSecondary,
              onRefresh: () => provider.fetchAll(forceRefresh: true),
              child: _selectedTab == 0
                  ? _buildContactsList(filteredContacts, provider)
                  : _buildGroupsList(filteredGroups, provider),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterPill(String filterKey, String label) {
    final isSelected = _contactFilter == filterKey;
    return InkWell(
      onTap: () => setState(() => _contactFilter = filterKey),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.accent : AppTheme.bgSecondary,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isSelected ? AppTheme.accent : AppTheme.borderColor),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? AppTheme.accentInvert : AppTheme.textSecondary,
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildContactsList(List<EmailContact> contacts, ContactsProvider provider) {
    if (provider.isLoading && contacts.isEmpty) {
      return const Center(child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.textMuted));
    }
    if (contacts.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(LucideIcons.users, size: 36, color: AppTheme.textDim),
            const SizedBox(height: 12),
            const Text('Kişi bulunamadı', style: TextStyle(color: AppTheme.textPrimary, fontSize: 15, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            const Text('Sağ alttaki butondan yeni kişi ekleyebilirsiniz.', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: contacts.length,
      itemBuilder: (ctx, idx) {
        final contact = contacts[idx];
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppTheme.bgSecondary,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.borderColor),
          ),
          child: Row(
            children: [
              SenderAvatar(
                avatarUrl: contact.avatarUrl,
                initials: contact.initials ?? contact.name.substring(0, 1).toUpperCase(),
                identifier: contact.email,
                size: 42,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            contact.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                        ),
                        if (contact.isImportant) ...[
                          const SizedBox(width: 6),
                          const Icon(LucideIcons.star, size: 13, color: AppTheme.amber),
                        ],
                        if (contact.isBlocked) ...[
                          const SizedBox(width: 6),
                          const Icon(LucideIcons.ban, size: 13, color: AppTheme.red),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      contact.email,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 12, fontFamily: 'monospace'),
                    ),
                    if (contact.emailsCount > 0) ...[
                      const SizedBox(height: 4),
                      Text(
                        '${contact.emailsCount} e-posta',
                        style: const TextStyle(color: AppTheme.textDim, fontSize: 11),
                      ),
                    ],
                  ],
                ),
              ),
              // Quick Actions
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: Icon(contact.isImportant ? LucideIcons.star : LucideIcons.star, size: 16),
                    color: contact.isImportant ? AppTheme.amber : AppTheme.textDim,
                    tooltip: contact.isImportant ? 'Önemliyi Kaldır' : 'Önemli Yap',
                    onPressed: () => provider.toggleImportant(contact.email),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.send, size: 16, color: AppTheme.blue),
                    tooltip: 'E-posta Yaz',
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ComposeView(initialTo: contact.email),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildGroupsList(List<ContactGroup> groups, ContactsProvider provider) {
    if (provider.isLoading && groups.isEmpty) {
      return const Center(child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.textMuted));
    }
    if (groups.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(LucideIcons.usersRound, size: 36, color: AppTheme.textDim),
            const SizedBox(height: 12),
            const Text('Grup bulunamadı', style: TextStyle(color: AppTheme.textPrimary, fontSize: 15, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            const Text('Sağ alttaki butondan yeni grup oluşturabilirsiniz.', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: groups.length,
      itemBuilder: (ctx, idx) {
        final group = groups[idx];
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.bgSecondary,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppTheme.borderColor),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Group Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.blue.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(LucideIcons.usersRound, size: 16, color: AppTheme.blue),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            group.name,
                            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 15, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            '@${group.alias}',
                            style: const TextStyle(color: AppTheme.blue, fontSize: 12, fontWeight: FontWeight.w600, fontFamily: 'monospace'),
                          ),
                        ],
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.trash2, size: 16, color: AppTheme.textDim),
                    tooltip: 'Grubu Sil',
                    onPressed: () => provider.deleteGroup(group.id),
                  ),
                ],
              ),
              if (group.description != null && group.description!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(group.description!, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
              ],
              const SizedBox(height: 12),

              // Members Chips
              const Text('ÜYELER', style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  ...group.members.map((member) {
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.bgTertiary,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppTheme.borderColor),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(member, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 11, fontFamily: 'monospace')),
                          const SizedBox(width: 4),
                          InkWell(
                            onTap: () => provider.removeMemberFromGroup(group.id, member),
                            child: const Icon(LucideIcons.x, size: 12, color: AppTheme.textMuted),
                          ),
                        ],
                      ),
                    );
                  }),
                  // Add Member Chip
                  InkWell(
                    onTap: () => _showAddMemberModal(context, group),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.blue.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppTheme.blue.withOpacity(0.3)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.plus, size: 12, color: AppTheme.blue),
                          SizedBox(width: 4),
                          Text('Üye Ekle', style: TextStyle(color: AppTheme.blue, fontSize: 11, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Send email to group button
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.accent,
                  foregroundColor: AppTheme.accentInvert,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  minimumSize: const Size(double.infinity, 38),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(LucideIcons.send, size: 14),
                label: Text('Gruba E-posta Gönder (${group.members.length} Kişi)', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                onPressed: () {
                  if (group.members.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Bu grupta henüz üye bulunmuyor.')),
                    );
                    return;
                  }
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => ComposeView(
                        initialTo: group.members.join(', '),
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }
}
