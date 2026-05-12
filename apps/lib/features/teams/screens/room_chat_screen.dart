import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/api_client.dart';
import '../../../core/unread_service.dart';
import '../models/organization.dart';
import '../widgets/chat_widgets.dart';
import '../widgets/room_conti_tab.dart';

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
          RoomContiTab(roomId: widget.roomId),
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
  String? _newestId;

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
      final msgs = (res.data as List)
          .map((e) => Message.fromJson(e as Map<String, dynamic>))
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
      final raw = res.data as List;
      if (raw.isEmpty) return;
      final newestFromServer = raw.last['id'] as String;
      if (newestFromServer == _newestId) return;

      final msgs = raw
          .map((e) => Message.fromJson(e as Map<String, dynamic>))
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
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('취소')),
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
                            if (showDate)
                              ChatDateDivider(date: msg.createdAt, cs: cs),
                            ChatMessageBubble(
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
        ChatInputBar(ctrl: _ctrl, sending: _sending, onSend: _send, cs: cs),
      ],
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    final la = a.toLocal();
    final lb = b.toLocal();
    return la.year == lb.year && la.month == lb.month && la.day == lb.day;
  }
}
