import 'package:flutter/material.dart';
import '../../../core/unread_service.dart';
import '../models/organization.dart';

class OrgSection extends StatelessWidget {
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

  const OrgSection({
    super.key,
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
                      fontSize: 12,
                      color: cs.onSurface.withValues(alpha: 0.4))),
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
                    const PopupMenuItem(
                        value: 'invite', child: Text('초대 링크 생성')),
                    const PopupMenuItem(
                        value: 'add_room', child: Text('채팅방 만들기')),
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
                    fontSize: 13,
                    color: cs.onSurface.withValues(alpha: 0.3))),
          )
        else
          ...org.rooms.map((room) => ValueListenableBuilder<Map<String, int>>(
                valueListenable: UnreadService.counts,
                builder: (_, counts, _) {
                  final unread = counts[room.id] ?? 0;
                  return ListTile(
                    dense: true,
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 20),
                    leading: Text('#',
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: cs.onSurface.withValues(alpha: 0.35))),
                    title: Text(room.name,
                        style: const TextStyle(fontSize: 14)),
                    subtitle: room.description != null &&
                            room.description!.isNotEmpty
                        ? Text(room.description!,
                            style: const TextStyle(fontSize: 12),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis)
                        : null,
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (unread > 0)
                          Container(
                            margin: const EdgeInsets.only(right: 4),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: cs.primary,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text('$unread',
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold)),
                          ),
                        if (isLeader)
                          IconButton(
                            icon: Icon(Icons.delete_outline,
                                size: 16,
                                color: cs.onSurface.withValues(alpha: 0.4)),
                            onPressed: () => onDeleteRoom(room),
                          )
                        else
                          const Icon(Icons.chevron_right),
                      ],
                    ),
                    onTap: () => onRoomTap(room),
                  );
                },
              )),
        Divider(height: 1, color: cs.outline.withValues(alpha: 0.2)),
      ],
    );
  }
}

class PendingInviteTile extends StatelessWidget {
  final PendingInvite invite;
  final ColorScheme cs;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  const PendingInviteTile({
    super.key,
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
