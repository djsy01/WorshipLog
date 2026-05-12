import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../../../core/unread_service.dart';
import '../../contis/models/conti.dart';
import '../models/organization.dart';

class RoomChatScreen extends StatefulWidget {
  final String roomId;
  final String roomName;
  final String myUserId;

  const RoomChatScreen({
    super.key,
    required this.roomId,
    required this.roomName,
    required this.myUserId,
  });

  @override
  State<RoomChatScreen> createState() => _RoomChatScreenState();
}

class _RoomChatScreenState extends State<RoomChatScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('#${widget.roomName}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabCtrl,
          tabs: const [
            Tab(text: '채팅'),
            Tab(text: '콘티'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _ChatTab(roomId: widget.roomId, myUserId: widget.myUserId),
          _ContiTab(roomId: widget.roomId),
        ],
      ),
    );
  }
}

// ─── 채팅 탭 ────────────────────────────────────────────────────────────────

class _ChatTab extends StatefulWidget {
  final String roomId;
  final String myUserId;
  const _ChatTab({required this.roomId, required this.myUserId});

  @override
  State<_ChatTab> createState() => _ChatTabState();
}

class _ChatTabState extends State<_ChatTab> {
  List<Message> _messages = [];
  bool _loading = true;
  final _ctrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  bool _sending = false;
  Timer? _pollTimer;
  String? _newestId; // 서버가 desc 반환 → msgs.first.id = 최신

  @override
  void initState() {
    super.initState();
    UnreadService.clear(widget.roomId);
    _loadMessages();
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) => _poll());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _ctrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    try {
      final res = await dio.get('rooms/${widget.roomId}/messages');
      // 서버가 createdAt desc 반환 → reversed() 로 오래된 것이 위, 최신이 아래
      final msgs = (res.data as List)
          .map((e) => Message.fromJson(e as Map<String, dynamic>))
          .toList()
          .reversed
          .toList();
      if (!mounted) return;
      setState(() {
        _messages = msgs;
        _newestId = msgs.isNotEmpty ? msgs.last.id : null;
        _loading = false;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _poll() async {
    try {
      final res = await dio.get('rooms/${widget.roomId}/messages');
      // 서버가 desc 반환 → first = 최신
      final raw = res.data as List;
      if (raw.isEmpty) return;
      final newestFromServer = raw.first['id'] as String;
      if (newestFromServer == _newestId) return; // 변화 없음

      final msgs = raw
          .map((e) => Message.fromJson(e as Map<String, dynamic>))
          .toList()
          .reversed
          .toList();
      if (!mounted) return;
      final atBottom = _scrollCtrl.hasClients &&
          _scrollCtrl.position.pixels >=
              _scrollCtrl.position.maxScrollExtent - 60;
      setState(() {
        _messages = msgs;
        _newestId = msgs.last.id;
      });
      if (atBottom) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
      }
    } catch (_) {}
  }

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      final res = await dio.post(
        'rooms/${widget.roomId}/messages',
        data: {'content': text},
      );
      final msg = Message.fromJson(res.data as Map<String, dynamic>);
      _ctrl.clear();
      setState(() {
        _messages.add(msg);
        _newestId = msg.id;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('전송에 실패했습니다.')));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _deleteMessage(String messageId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('메시지 삭제'),
        content: const Text('이 메시지를 삭제할까요?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('삭제'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await dio.delete('rooms/${widget.roomId}/messages/$messageId');
      setState(() => _messages.removeWhere((m) => m.id == messageId));
    } catch (_) {}
  }

  void _scrollToBottom() {
    if (_scrollCtrl.hasClients) {
      _scrollCtrl.animateTo(
        _scrollCtrl.position.maxScrollExtent,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      children: [
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _messages.isEmpty
                  ? Center(
                      child: Text('아직 메시지가 없습니다.',
                          style: TextStyle(
                              color: cs.onSurface.withValues(alpha: 0.3),
                              fontSize: 14)),
                    )
                  : ListView.builder(
                      controller: _scrollCtrl,
                      padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
                      itemCount: _messages.length,
                      itemBuilder: (_, i) {
                        final msg = _messages[i];
                        final isMe = msg.userId == widget.myUserId;
                        final showName = !isMe &&
                            (i == 0 ||
                                _messages[i - 1].userId != msg.userId);
                        final showDate = i == 0 ||
                            !_isSameDay(
                                _messages[i - 1].createdAt, msg.createdAt);
                        return Column(
                          children: [
                            if (showDate) _DateDivider(date: msg.createdAt, cs: cs),
                            _MessageBubble(
                              msg: msg,
                              isMe: isMe,
                              showName: showName,
                              cs: cs,
                              onLongPress:
                                  isMe ? () => _deleteMessage(msg.id) : null,
                            ),
                          ],
                        );
                      },
                    ),
        ),
        _InputBar(ctrl: _ctrl, sending: _sending, onSend: _send, cs: cs),
      ],
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    final la = a.toLocal();
    final lb = b.toLocal();
    return la.year == lb.year && la.month == lb.month && la.day == lb.day;
  }
}

// ─── 콘티 탭 ────────────────────────────────────────────────────────────────

class _ContiTab extends StatefulWidget {
  final String roomId;
  const _ContiTab({required this.roomId});

  @override
  State<_ContiTab> createState() => _ContiTabState();
}

class _ContiTabState extends State<_ContiTab> {
  List<Conti> _contis = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await dio.get('rooms/${widget.roomId}/contis');
      final contis = (res.data as List)
          .map((e) => Conti.fromJson(e as Map<String, dynamic>))
          .toList();
      if (!mounted) return;
      setState(() {
        _contis = contis;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_contis.isEmpty) {
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.list_alt_outlined,
              size: 48, color: cs.onSurface.withValues(alpha: 0.15)),
          const SizedBox(height: 12),
          Text('공유된 콘티가 없습니다.',
              style: TextStyle(
                  color: cs.onSurface.withValues(alpha: 0.4), fontSize: 14)),
        ]),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: _contis.length,
        separatorBuilder: (_, i) => const SizedBox(height: 8),
        itemBuilder: (context, i) {
          final c = _contis[i];
          return InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => context.go('/contis/${c.id}'),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: cs.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: cs.outline.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(c.title,
                            style: const TextStyle(
                                fontSize: 15, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Row(children: [
                          Icon(Icons.music_note,
                              size: 13,
                              color: cs.onSurface.withValues(alpha: 0.4)),
                          const SizedBox(width: 4),
                          Text('${c.songCount}곡',
                              style: TextStyle(
                                  fontSize: 12,
                                  color: cs.onSurface.withValues(alpha: 0.5))),
                          if (c.worshipDate != null) ...[
                            const SizedBox(width: 12),
                            Icon(Icons.calendar_today,
                                size: 12,
                                color: cs.onSurface.withValues(alpha: 0.4)),
                            const SizedBox(width: 4),
                            Text(
                              '${c.worshipDate!.year}.${c.worshipDate!.month.toString().padLeft(2, '0')}.${c.worshipDate!.day.toString().padLeft(2, '0')}',
                              style: TextStyle(
                                  fontSize: 12,
                                  color: cs.onSurface.withValues(alpha: 0.5)),
                            ),
                          ],
                        ]),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right,
                      color: cs.onSurface.withValues(alpha: 0.3)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

// ─── 공통 위젯 ──────────────────────────────────────────────────────────────

class _DateDivider extends StatelessWidget {
  final DateTime date;
  final ColorScheme cs;
  const _DateDivider({required this.date, required this.cs});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final local = date.toLocal();
    String label;
    if (local.year == now.year && local.month == now.month && local.day == now.day) {
      label = '오늘';
    } else {
      label = '${local.year}년 ${local.month}월 ${local.day}일';
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(children: [
        Expanded(child: Divider(color: cs.outline.withValues(alpha: 0.3))),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Text(label,
              style: TextStyle(
                  fontSize: 11, color: cs.onSurface.withValues(alpha: 0.4))),
        ),
        Expanded(child: Divider(color: cs.outline.withValues(alpha: 0.3))),
      ]),
    );
  }
}

class _InputBar extends StatelessWidget {
  final TextEditingController ctrl;
  final bool sending;
  final VoidCallback onSend;
  final ColorScheme cs;

  const _InputBar(
      {required this.ctrl,
      required this.sending,
      required this.onSend,
      required this.cs});

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Container(
      padding: EdgeInsets.fromLTRB(12, 8, 12, 8 + bottom),
      decoration: BoxDecoration(
          border:
              Border(top: BorderSide(color: cs.outline.withValues(alpha: 0.2)))),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: ctrl,
              decoration: InputDecoration(
                hintText: '메시지 입력...',
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                border:
                    OutlineInputBorder(borderRadius: BorderRadius.circular(24)),
              ),
              onSubmitted: (_) => onSend(),
              textInputAction: TextInputAction.send,
              minLines: 1,
              maxLines: 4,
            ),
          ),
          const SizedBox(width: 8),
          IconButton.filled(
            onPressed: sending ? null : onSend,
            icon: sending
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.send),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final Message msg;
  final bool isMe;
  final bool showName;
  final ColorScheme cs;
  final VoidCallback? onLongPress;

  const _MessageBubble(
      {required this.msg,
      required this.isMe,
      required this.showName,
      required this.cs,
      this.onLongPress});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Align(
        alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
        child: Column(
          crossAxisAlignment:
              isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (showName)
              Padding(
                padding: const EdgeInsets.only(left: 4, bottom: 2),
                child: Text(msg.userName,
                    style: TextStyle(
                        fontSize: 11,
                        color: cs.onSurface.withValues(alpha: 0.45),
                        fontWeight: FontWeight.w500)),
              ),
            GestureDetector(
              onLongPress: onLongPress,
              child: Container(
                constraints: BoxConstraints(
                    maxWidth: MediaQuery.of(context).size.width * 0.72),
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: isMe ? cs.primary : cs.surfaceContainerHighest,
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(16),
                    topRight: const Radius.circular(16),
                    bottomLeft: Radius.circular(isMe ? 16 : 4),
                    bottomRight: Radius.circular(isMe ? 4 : 16),
                  ),
                ),
                child: Text(msg.content,
                    style: TextStyle(
                        fontSize: 14,
                        color: isMe ? Colors.white : cs.onSurface)),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 2, left: 4, right: 4),
              child: Text(_formatTime(msg.createdAt),
                  style: TextStyle(
                      fontSize: 10,
                      color: cs.onSurface.withValues(alpha: 0.3))),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final local = dt.toLocal();
    final h = local.hour;
    final m = local.minute.toString().padLeft(2, '0');
    final ampm = h >= 12 ? '오후' : '오전';
    final dh = h > 12 ? h - 12 : (h == 0 ? 12 : h);
    return '$ampm $dh:$m';
  }
}
