import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/organization.dart';
import '../providers/orgs_provider.dart';
import 'room_chat_screen.dart';

class TeamScreen extends ConsumerStatefulWidget {
  const TeamScreen({super.key});

  @override
  ConsumerState<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends ConsumerState<TeamScreen> {
  void _showCreateOrg() {
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('팀 만들기'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(labelText: '팀 이름 *'),
              autofocus: true),
          const SizedBox(height: 8),
          TextField(
              controller: descCtrl,
              decoration: const InputDecoration(labelText: '설명 (선택)')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('취소')),
          FilledButton(
            onPressed: () async {
              if (nameCtrl.text.trim().isEmpty) return;
              Navigator.pop(ctx);
              final result = await ref
                  .read(orgsProvider.notifier)
                  .create(name: nameCtrl.text.trim(), description: descCtrl.text.trim());
              if (result == null && mounted) {
                ScaffoldMessenger.of(context)
                    .showSnackBar(const SnackBar(content: Text('팀 생성에 실패했습니다.')));
              }
            },
            child: const Text('만들기'),
          ),
        ],
      ),
    );
  }

  void _showJoinByToken() {
    final tokenCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('팀 참가'),
        content: TextField(
          controller: tokenCtrl,
          decoration: const InputDecoration(labelText: '초대 토큰'),
          autofocus: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('취소')),
          FilledButton(
            onPressed: () async {
              if (tokenCtrl.text.trim().isEmpty) return;
              Navigator.pop(ctx);
              final result = await ref
                  .read(orgsProvider.notifier)
                  .joinByToken(tokenCtrl.text.trim());
              if (result == null && mounted) {
                ScaffoldMessenger.of(context)
                    .showSnackBar(const SnackBar(content: Text('유효하지 않은 토큰입니다.')));
              }
            },
            child: const Text('참가'),
          ),
        ],
      ),
    );
  }

  Future<void> _showInviteDialog(Organization org) async {
    final token = await ref.read(orgsProvider.notifier).createInviteToken(org.id);
    if (!mounted) return;
    if (token == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('초대 링크 생성에 실패했습니다.')));
      return;
    }
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('초대 토큰'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('아래 토큰을 팀원에게 공유하세요.',
              style: TextStyle(fontSize: 13)),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(ctx).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(8),
            ),
            child: SelectableText(token,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 13)),
          ),
        ]),
        actions: [
          TextButton(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: token));
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('클립보드에 복사되었습니다.')));
            },
            child: const Text('복사'),
          ),
          FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('닫기')),
        ],
      ),
    );
  }

  void _showCreateRoom(Organization org) {
    final nameCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('채팅방 만들기'),
        content: TextField(
          controller: nameCtrl,
          decoration: const InputDecoration(labelText: '방 이름 *'),
          autofocus: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('취소')),
          FilledButton(
            onPressed: () async {
              if (nameCtrl.text.trim().isEmpty) return;
              Navigator.pop(ctx);
              await ref
                  .read(orgsProvider.notifier)
                  .createRoom(org.id, nameCtrl.text.trim());
            },
            child: const Text('만들기'),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteRoom(Organization org, OrgRoom room) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('채팅방 삭제'),
        content: Text('"#${room.name}" 채팅방을 삭제할까요?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('취소')),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await ref.read(orgsProvider.notifier).deleteRoom(org.id, room.id);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('삭제'),
          ),
        ],
      ),
    );
  }

  void _confirmLeaveOrg(Organization org, bool isOwner) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isOwner ? '팀 삭제' : '팀 나가기'),
        content: Text(isOwner
            ? '"${org.name}" 팀을 삭제하시겠습니까? 모든 데이터가 삭제됩니다.'
            : '"${org.name}" 팀에서 나가시겠습니까?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('취소')),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              if (isOwner) {
                await ref.read(orgsProvider.notifier).remove(org.id);
              } else {
                await ref.read(orgsProvider.notifier).leave(org.id);
              }
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text(isOwner ? '삭제' : '나가기'),
          ),
        ],
      ),
    );
  }

  void _showMembers(Organization org, String myUserId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('${org.name} 멤버 (${org.members.length}명)'),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: org.members.length,
            itemBuilder: (_, i) {
              final m = org.members[i];
              final roleLabel = m.role == 'leader'
                  ? '리더'
                  : m.role == 'sub_leader'
                      ? '부리더'
                      : '';
              return ListTile(
                dense: true,
                title: Row(children: [
                  Text(m.name, style: const TextStyle(fontSize: 14)),
                  if (m.userId == myUserId) ...[
                    const SizedBox(width: 4),
                    Text('(나)',
                        style: TextStyle(
                            fontSize: 12,
                            color: Theme.of(ctx).colorScheme.onSurface.withValues(alpha: 0.4))),
                  ],
                ]),
                subtitle: Text(m.email, style: const TextStyle(fontSize: 12)),
                trailing: roleLabel.isNotEmpty
                    ? Text(roleLabel,
                        style: TextStyle(
                            fontSize: 12,
                            color: Theme.of(ctx).colorScheme.primary,
                            fontWeight: FontWeight.w600))
                    : null,
              );
            },
          ),
        ),
        actions: [
          FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('닫기')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final state = ref.watch(orgsProvider);
    final myUserId = ref.watch(authProvider).user?.id ?? '';

    return Scaffold(
      appBar: AppBar(
        leading: Padding(
          padding: const EdgeInsets.all(10),
          child: Image.asset('assets/images/logo.png', fit: BoxFit.contain),
        ),
        title: const Text('팀스페이스', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.group_add_outlined),
            tooltip: '팀 참가',
            onPressed: _showJoinByToken,
          ),
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: '팀 만들기',
            onPressed: _showCreateOrg,
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null
              ? Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Text(state.error!,
                        style: TextStyle(color: cs.error), textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: () => ref.read(orgsProvider.notifier).load(),
                      child: const Text('다시 시도'),
                    ),
                  ]),
                )
              : RefreshIndicator(
                  onRefresh: () => ref.read(orgsProvider.notifier).load(),
                  child: _buildBody(context, state, myUserId, cs),
                ),
    );
  }

  Widget _buildBody(
      BuildContext context, OrgsState state, String myUserId, ColorScheme cs) {
    if (state.orgs.isEmpty && state.pendingInvites.isEmpty) {
      return ListView(
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.6,
            child: Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.group_outlined,
                    size: 64, color: cs.onSurface.withValues(alpha: 0.15)),
                const SizedBox(height: 16),
                Text('소속된 팀이 없습니다.',
                    style: TextStyle(
                        color: cs.onSurface.withValues(alpha: 0.4), fontSize: 15)),
                const SizedBox(height: 20),
                Wrap(spacing: 8, children: [
                  OutlinedButton.icon(
                    icon: const Icon(Icons.group_add),
                    label: const Text('팀 참가'),
                    onPressed: _showJoinByToken,
                  ),
                  FilledButton.icon(
                    icon: const Icon(Icons.add),
                    label: const Text('팀 만들기'),
                    onPressed: _showCreateOrg,
                  ),
                ]),
              ]),
            ),
          ),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        if (state.pendingInvites.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 6),
            child: Text('받은 초대',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: cs.onSurface.withValues(alpha: 0.5),
                    letterSpacing: 0.5)),
          ),
          ...state.pendingInvites.map((invite) => _PendingInviteTile(
                invite: invite,
                cs: cs,
                onAccept: () =>
                    ref.read(orgsProvider.notifier).respondToInvite(invite.id, true),
                onReject: () =>
                    ref.read(orgsProvider.notifier).respondToInvite(invite.id, false),
              )),
          const Divider(height: 24),
        ],
        ...state.orgs.map((org) {
          final isLeader = org.createdBy == myUserId ||
              org.members.any((m) =>
                  m.userId == myUserId &&
                  (m.role == 'leader' || m.role == 'sub_leader'));
          return _OrgSection(
            org: org,
            isLeader: isLeader,
            myUserId: myUserId,
            cs: cs,
            onRoomTap: (room) => Navigator.of(context).push(MaterialPageRoute(
              builder: (_) => RoomChatScreen(
                roomId: room.id,
                roomName: room.name,
                myUserId: myUserId,
              ),
            )),
            onInvite: () => _showInviteDialog(org),
            onAddRoom: () => _showCreateRoom(org),
            onDeleteRoom: (room) => _confirmDeleteRoom(org, room),
            onLeave: () => _confirmLeaveOrg(org, org.createdBy == myUserId),
            onMembers: () => _showMembers(org, myUserId),
          );
        }),
      ],
    );
  }
}

class _OrgSection extends StatelessWidget {
  final Organization org;
  final bool isLeader;
  final String myUserId;
  final ColorScheme cs;
  final void Function(OrgRoom) onRoomTap;
  final VoidCallback onInvite;
  final VoidCallback onAddRoom;
  final void Function(OrgRoom) onDeleteRoom;
  final VoidCallback onLeave;
  final VoidCallback onMembers;

  const _OrgSection({
    required this.org,
    required this.isLeader,
    required this.myUserId,
    required this.cs,
    required this.onRoomTap,
    required this.onInvite,
    required this.onAddRoom,
    required this.onDeleteRoom,
    required this.onLeave,
    required this.onMembers,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 8, 4),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(org.name,
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.bold)),
                    if (org.description != null && org.description!.isNotEmpty)
                      Text(org.description!,
                          style: TextStyle(
                              fontSize: 12,
                              color: cs.onSurface.withValues(alpha: 0.4))),
                  ],
                ),
              ),
              Text('${org.members.length}명',
                  style: TextStyle(
                      fontSize: 12, color: cs.onSurface.withValues(alpha: 0.4))),
              IconButton(
                icon: const Icon(Icons.people_outline, size: 18),
                onPressed: onMembers,
                tooltip: '멤버 보기',
              ),
              PopupMenuButton<String>(
                iconSize: 18,
                onSelected: (v) {
                  if (v == 'invite') onInvite();
                  if (v == 'add_room') onAddRoom();
                  if (v == 'leave') onLeave();
                },
                itemBuilder: (_) => [
                  if (isLeader) ...[
                    const PopupMenuItem(value: 'invite', child: Text('초대 링크 생성')),
                    const PopupMenuItem(value: 'add_room', child: Text('채팅방 만들기')),
                    const PopupMenuDivider(),
                  ],
                  PopupMenuItem(
                    value: 'leave',
                    child: Text(
                      org.createdBy == myUserId ? '팀 삭제' : '팀 나가기',
                      style: const TextStyle(color: Colors.red),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        if (org.rooms.isEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 2, 16, 8),
            child: Text('채팅방이 없습니다.',
                style: TextStyle(
                    fontSize: 13, color: cs.onSurface.withValues(alpha: 0.3))),
          )
        else
          ...org.rooms.map((room) => ListTile(
                dense: true,
                contentPadding: const EdgeInsets.symmetric(horizontal: 20),
                leading: Text('#',
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: cs.onSurface.withValues(alpha: 0.35))),
                title: Text(room.name, style: const TextStyle(fontSize: 14)),
                subtitle: room.description != null && room.description!.isNotEmpty
                    ? Text(room.description!,
                        style: const TextStyle(fontSize: 12),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis)
                    : null,
                trailing: isLeader
                    ? IconButton(
                        icon: Icon(Icons.delete_outline,
                            size: 16,
                            color: cs.onSurface.withValues(alpha: 0.4)),
                        onPressed: () => onDeleteRoom(room),
                      )
                    : const Icon(Icons.chevron_right),
                onTap: () => onRoomTap(room),
              )),
        Divider(height: 1, color: cs.outline.withValues(alpha: 0.2)),
      ],
    );
  }
}

class _PendingInviteTile extends StatelessWidget {
  final PendingInvite invite;
  final ColorScheme cs;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  const _PendingInviteTile({
    required this.invite,
    required this.cs,
    required this.onAccept,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cs.primaryContainer.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cs.primary.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(invite.orgName,
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w600)),
                Text('${invite.creatorName}님의 초대',
                    style: TextStyle(
                        fontSize: 12,
                        color: cs.onSurface.withValues(alpha: 0.5))),
              ],
            ),
          ),
          TextButton(
            onPressed: onReject,
            style: TextButton.styleFrom(foregroundColor: cs.error),
            child: const Text('거절'),
          ),
          const SizedBox(width: 4),
          FilledButton(
            onPressed: onAccept,
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 16),
            ),
            child: const Text('수락'),
          ),
        ],
      ),
    );
  }
}
