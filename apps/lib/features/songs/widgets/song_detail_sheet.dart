import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/songs_provider.dart';
import '../models/song.dart';
import 'song_widgets.dart';
import 'song_edit_sheet.dart';

class SongDetailSheet extends ConsumerStatefulWidget {
  final Song song;
  const SongDetailSheet({super.key, required this.song});

  @override
  ConsumerState<SongDetailSheet> createState() => _SongDetailSheetState();
}

class _SongDetailSheetState extends ConsumerState<SongDetailSheet> {
  late Song _song;
  bool _deleting = false;

  @override
  void initState() {
    super.initState();
    _song = widget.song;
  }

  bool _canEdit(AuthState auth) {
    if (auth.status != AuthStatus.authenticated || auth.user == null) return false;
    if (auth.user!.role == 'admin') return true;
    if (_song.createdBy != null && _song.createdBy == auth.user!.id) return true;
    return false;
  }

  Future<void> _delete(BuildContext context) async {
    final nav = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('찬양 삭제'),
        content: Text('"${_song.title}"을(를) 삭제하시겠습니까?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('취소')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('삭제', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _deleting = true);
    try {
      await ref.read(songsProvider.notifier).deleteSong(_song.id);
      if (mounted) nav.pop();
    } catch (e) {
      if (mounted) {
        setState(() => _deleting = false);
        messenger.showSnackBar(SnackBar(content: Text('삭제 실패: $e')));
      }
    }
  }

  Future<void> _openEdit(BuildContext context) async {
    final updated = await showModalBottomSheet<Song>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SongEditSheet(song: _song),
    );
    if (updated != null && mounted) setState(() => _song = updated);
  }

  Future<void> _openSheetMusic(BuildContext context) async {
    final url = _song.sheetMusicUrl;
    if (url == null || url.isEmpty) return;
    final messenger = ScaffoldMessenger.of(context);
    final opened = await launchSheetUrl(url);
    if (!opened) messenger.showSnackBar(const SnackBar(content: Text('악보를 열 수 없습니다.')));
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final canEdit = _canEdit(auth);

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.4,
      maxChildSize: 0.92,
      builder: (_, controller) => Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1F2937) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            Container(
              margin: const EdgeInsets.only(top: 12, bottom: 4),
              width: 36, height: 4,
              decoration: BoxDecoration(color: cs.outline.withValues(alpha: 0.4), borderRadius: BorderRadius.circular(2)),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 16, 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_song.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                        if (_song.artist != null) ...[
                          const SizedBox(height: 2),
                          Text(_song.artist!, style: TextStyle(fontSize: 14, color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280))),
                        ],
                      ],
                    ),
                  ),
                  IconButton(onPressed: () => Navigator.pop(context), icon: Icon(Icons.close, color: Colors.grey[500])),
                ],
              ),
            ),
            if (_song.defaultKey != null || _song.tempo != null || _song.scriptureRef != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
                child: Wrap(
                  spacing: 8, runSpacing: 6,
                  children: [
                    if (_song.defaultKey != null)
                      SongBadge(text: _song.defaultKey!, bgColor: isDark ? const Color(0xFF4C1D95).withValues(alpha: 0.4) : const Color(0xFFEDE9FE), textColor: isDark ? const Color(0xFFA78BFA) : const Color(0xFF5B21B6)),
                    if (_song.tempo != null)
                      SongBadge(text: '♩ ${_song.tempo} BPM', bgColor: isDark ? const Color(0xFF78350F).withValues(alpha: 0.4) : const Color(0xFFFEF3C7), textColor: isDark ? const Color(0xFFFBBF24) : const Color(0xFF92400E)),
                    if (_song.scriptureRef != null)
                      SongBadge(text: '📖 ${_song.scriptureRef!}', bgColor: isDark ? const Color(0xFF1F2937) : const Color(0xFFF3F4F6), textColor: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF4B5563)),
                  ],
                ),
              ),
            Divider(height: 24, indent: 20, endIndent: 20, color: cs.outline.withValues(alpha: 0.3)),
            Expanded(
              child: _song.lyrics != null
                  ? ListView(
                      controller: controller,
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
                      children: [
                        Text('가사', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2, color: Colors.grey[500])),
                        const SizedBox(height: 8),
                        Text(_song.lyrics!, style: const TextStyle(fontSize: 14, height: 1.8)),
                      ],
                    )
                  : Center(child: Text('등록된 가사가 없습니다.', style: TextStyle(color: Colors.grey[500], fontSize: 14))),
            ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_song.sheetMusicUrl != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: () => _openSheetMusic(context),
                            icon: const Icon(Icons.picture_as_pdf_outlined, size: 18),
                            label: const Text('악보 보기'),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              side: BorderSide(color: cs.outline.withValues(alpha: 0.5)),
                            ),
                          ),
                        ),
                      ),
                    if (canEdit)
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => _openEdit(context),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                side: BorderSide(color: cs.outline.withValues(alpha: 0.5)),
                              ),
                              child: const Text('수정'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton(
                              onPressed: _deleting ? null : () => _delete(context),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                foregroundColor: Colors.red,
                                side: BorderSide(color: Colors.red.withValues(alpha: 0.4)),
                              ),
                              child: _deleting
                                  ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                                  : const Text('삭제'),
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
