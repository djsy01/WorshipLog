import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api_client.dart';
import '../models/organization.dart';

class OrgsState {
  final List<Organization> orgs;
  final bool isLoading;
  final String? error;
  final List<PendingInvite> pendingInvites;

  const OrgsState({
    this.orgs = const [],
    this.isLoading = false,
    this.error,
    this.pendingInvites = const [],
  });

  OrgsState copyWith({
    List<Organization>? orgs,
    bool? isLoading,
    String? error,
    List<PendingInvite>? pendingInvites,
  }) =>
      OrgsState(
        orgs: orgs ?? this.orgs,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        pendingInvites: pendingInvites ?? this.pendingInvites,
      );
}

class OrgsNotifier extends StateNotifier<OrgsState> {
  OrgsNotifier() : super(const OrgsState(isLoading: true)) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: true);
    try {
      final results = await Future.wait([
        dio.get('organizations'),
        dio.get('organizations/invites'),
      ]);
      final orgs = (results[0].data as List)
          .map((e) => Organization.fromJson(e as Map<String, dynamic>))
          .toList();
      final invites = (results[1].data as List)
          .map((e) => PendingInvite.fromJson(e as Map<String, dynamic>))
          .toList();
      state = OrgsState(orgs: orgs, pendingInvites: invites);
    } catch (e) {
      state = OrgsState(error: e.toString());
    }
  }

  Future<Organization?> create({required String name, String? description}) async {
    try {
      final res = await dio.post('organizations', data: {
        'name': name,
        if (description != null && description.isNotEmpty) 'description': description,
      });
      final org = Organization.fromJson(res.data as Map<String, dynamic>);
      state = state.copyWith(orgs: [org, ...state.orgs]);
      return org;
    } catch (_) {
      return null;
    }
  }

  Future<Organization?> joinByToken(String token) async {
    try {
      final res = await dio.post('organizations/join/$token');
      final org = Organization.fromJson(res.data as Map<String, dynamic>);
      state = state.copyWith(orgs: [org, ...state.orgs]);
      return org;
    } catch (_) {
      return null;
    }
  }

  Future<bool> leave(String orgId) async {
    try {
      await dio.delete('organizations/$orgId/leave');
      state = state.copyWith(orgs: state.orgs.where((o) => o.id != orgId).toList());
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> remove(String orgId) async {
    try {
      await dio.delete('organizations/$orgId');
      state = state.copyWith(orgs: state.orgs.where((o) => o.id != orgId).toList());
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> respondToInvite(String inviteId, bool accept) async {
    try {
      if (accept) {
        final res = await dio.post('organizations/invites/$inviteId/accept');
        final org = Organization.fromJson(res.data as Map<String, dynamic>);
        state = state.copyWith(
          orgs: [org, ...state.orgs.where((o) => o.id != org.id)],
          pendingInvites: state.pendingInvites.where((i) => i.id != inviteId).toList(),
        );
      } else {
        await dio.post('organizations/invites/$inviteId/reject');
        state = state.copyWith(
          pendingInvites: state.pendingInvites.where((i) => i.id != inviteId).toList(),
        );
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<OrgRoom?> createRoom(String orgId, String name, {String? description}) async {
    try {
      final res = await dio.post('rooms', data: {
        'orgId': orgId,
        'name': name,
        if (description != null && description.isNotEmpty) 'description': description,
      });
      final room = OrgRoom.fromJson(res.data as Map<String, dynamic>);
      state = state.copyWith(
        orgs: state.orgs
            .map((o) => o.id == orgId
                ? Organization(
                    id: o.id,
                    name: o.name,
                    description: o.description,
                    createdBy: o.createdBy,
                    members: o.members,
                    rooms: [...o.rooms, room],
                  )
                : o)
            .toList(),
      );
      return room;
    } catch (_) {
      return null;
    }
  }

  Future<bool> deleteRoom(String orgId, String roomId) async {
    try {
      await dio.delete('rooms/$roomId');
      state = state.copyWith(
        orgs: state.orgs
            .map((o) => o.id == orgId
                ? Organization(
                    id: o.id,
                    name: o.name,
                    description: o.description,
                    createdBy: o.createdBy,
                    members: o.members,
                    rooms: o.rooms.where((r) => r.id != roomId).toList(),
                  )
                : o)
            .toList(),
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<String?> createInviteToken(String orgId) async {
    try {
      final res = await dio.post('organizations/$orgId/invite');
      return res.data['token'] as String;
    } catch (_) {
      return null;
    }
  }
}

final orgsProvider = StateNotifierProvider<OrgsNotifier, OrgsState>(
  (ref) => OrgsNotifier(),
);
