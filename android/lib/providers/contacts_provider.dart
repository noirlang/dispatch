import 'package:flutter/material.dart';
import '../models/contact.dart';
import '../services/api_service.dart';

class ContactsProvider extends ChangeNotifier {
  List<EmailContact> _contacts = [];
  List<ContactGroup> _groups = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<EmailContact> get contacts => _contacts;
  List<ContactGroup> get groups => _groups;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchAll({bool forceRefresh = false}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final resContacts = await ApiService.get('/emails/contacts');
      if (resContacts is List) {
        _contacts = resContacts
            .whereType<Map<String, dynamic>>()
            .map((j) => EmailContact.fromJson(j))
            .toList();
      }

      final resGroups = await ApiService.get('/contact_groups');
      if (resGroups is List) {
        _groups = resGroups
            .whereType<Map<String, dynamic>>()
            .map((j) => ContactGroup.fromJson(j))
            .toList();
      }
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> addContact(String email, {String status = 'approved'}) async {
    try {
      final res = await ApiService.post('/sender_rules', body: {
        'email_address': email.trim().toLowerCase(),
        'status': status,
      });
      if (res is Map<String, dynamic>) {
        await fetchAll(forceRefresh: true);
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<bool> toggleImportant(String email) async {
    final cleanEmail = email.trim().toLowerCase();
    final idx = _contacts.indexWhere((c) => c.email.toLowerCase() == cleanEmail);
    if (idx != -1) {
      final current = _contacts[idx];
      final newStatus = current.isImportant ? 'approved' : 'important';
      try {
        await ApiService.post('/sender_rules', body: {
          'email_address': cleanEmail,
          'status': newStatus,
        });
        await fetchAll(forceRefresh: true);
        return true;
      } catch (_) {}
    }
    return false;
  }

  Future<bool> blockContact(String email) async {
    final cleanEmail = email.trim().toLowerCase();
    try {
      await ApiService.post('/sender_rules', body: {
        'email_address': cleanEmail,
        'status': 'blocked',
      });
      await fetchAll(forceRefresh: true);
      return true;
    } catch (_) {}
    return false;
  }

  Future<bool> createGroup({
    required String name,
    required String alias,
    String? description,
    List<String> members = const [],
  }) async {
    try {
      final res = await ApiService.post('/contact_groups', body: {
        'name': name.trim(),
        'alias': alias.trim().replaceAll('@', ''),
        if (description != null) 'description': description.trim(),
        'members': members,
      });
      if (res is Map<String, dynamic>) {
        await fetchAll(forceRefresh: true);
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<bool> deleteGroup(int id) async {
    _groups.removeWhere((g) => g.id == id);
    notifyListeners();

    try {
      await ApiService.delete('/contact_groups/$id');
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> addMemberToGroup(int groupId, String email) async {
    final group = _groups.firstWhere((g) => g.id == groupId, orElse: () => _groups.first);
    final updatedMembers = List<String>.from(group.members)..add(email.trim().toLowerCase());
    try {
      await ApiService.patch('/contact_groups/$groupId', body: {
        'members': updatedMembers,
      });
      await fetchAll(forceRefresh: true);
      return true;
    } catch (_) {}
    return false;
  }

  Future<bool> removeMemberFromGroup(int groupId, String email) async {
    final group = _groups.firstWhere((g) => g.id == groupId, orElse: () => _groups.first);
    final updatedMembers = List<String>.from(group.members)..remove(email.trim().toLowerCase());
    try {
      await ApiService.patch('/contact_groups/$groupId', body: {
        'members': updatedMembers,
      });
      await fetchAll(forceRefresh: true);
      return true;
    } catch (_) {}
    return false;
  }
}
