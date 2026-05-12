import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/organization.dart';

bool isImageUrl(String url) {
  final lower = url.toLowerCase().split('?').first;
  return lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.png') ||
      lower.endsWith('.gif') ||
      lower.endsWith('.webp');
}

class ChatDateDivider extends StatelessWidget {
  final DateTime date;
  final ColorScheme cs;
  const ChatDateDivider({super.key, required this.date, required this.cs});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final local = date.toLocal();
    final label = (local.year == now.year && local.month == now.month && local.day == now.day)
        ? '오늘'
        : '${local.year}년 ${local.month}월 ${local.day}일';
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

class ChatInputBar extends StatelessWidget {
  final TextEditingController ctrl;
  final bool sending;
  final VoidCallback onSend;
  final ColorScheme cs;

  const ChatInputBar(
      {super.key,
      required this.ctrl,
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

class ChatMessageBubble extends StatelessWidget {
  final Message msg;
  final bool isMe;
  final bool showName;
  final ColorScheme cs;
  final VoidCallback? onLongPress;

  const ChatMessageBubble(
      {super.key,
      required this.msg,
      required this.isMe,
      required this.showName,
      required this.cs,
      this.onLongPress});

  @override
  Widget build(BuildContext context) {
    final hasFile = msg.fileUrl != null && msg.fileUrl!.isNotEmpty;
    final isImage = hasFile && isImageUrl(msg.fileUrl!);
    final bubbleColor = isMe ? cs.primary : cs.surfaceContainerHighest;
    final textColor = isMe ? Colors.white : cs.onSurface;

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
                decoration: BoxDecoration(
                  color: hasFile && isImage ? Colors.transparent : bubbleColor,
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(16),
                    topRight: const Radius.circular(16),
                    bottomLeft: Radius.circular(isMe ? 16 : 4),
                    bottomRight: Radius.circular(isMe ? 4 : 16),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (isImage)
                      ClipRRect(
                        borderRadius: BorderRadius.only(
                          topLeft: const Radius.circular(16),
                          topRight: const Radius.circular(16),
                          bottomLeft: Radius.circular(isMe ? 16 : 4),
                          bottomRight: Radius.circular(isMe ? 4 : 16),
                        ),
                        child: Image.network(
                          msg.fileUrl!,
                          fit: BoxFit.cover,
                          width: MediaQuery.of(context).size.width * 0.6,
                          errorBuilder: (context, error, _) => Container(
                            width: MediaQuery.of(context).size.width * 0.6,
                            height: 100,
                            color: cs.surfaceContainerHighest,
                            child: Icon(Icons.broken_image_outlined,
                                color: cs.onSurface.withValues(alpha: 0.3)),
                          ),
                        ),
                      )
                    else if (hasFile)
                      GestureDetector(
                        onTap: () => launchUrl(Uri.parse(msg.fileUrl!),
                            mode: LaunchMode.externalApplication),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.attach_file,
                                  size: 16,
                                  color: textColor.withValues(alpha: 0.8)),
                              const SizedBox(width: 4),
                              Flexible(
                                child: Text(
                                  msg.fileUrl!.split('/').last.split('?').first,
                                  style: TextStyle(
                                      fontSize: 13,
                                      color: textColor,
                                      decoration: TextDecoration.underline),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    if (msg.content.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        child: Text(msg.content,
                            style: TextStyle(fontSize: 14, color: textColor)),
                      ),
                  ],
                ),
              ),
            ),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (msg.unreadCount > 0)
                  Padding(
                    padding: EdgeInsets.only(
                        right: isMe ? 4 : 0, left: isMe ? 0 : 4),
                    child: Text(
                      '${msg.unreadCount}',
                      style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFFACC15)),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.only(top: 2, left: 2, right: 2),
                  child: Text(_formatTime(msg.createdAt),
                      style: TextStyle(
                          fontSize: 10,
                          color: cs.onSurface.withValues(alpha: 0.3))),
                ),
              ],
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
