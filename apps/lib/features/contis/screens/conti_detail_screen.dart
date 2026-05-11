import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api_client.dart';
import '../models/conti_detail.dart';
import '../providers/contis_provider.dart';
import '../widgets/add_song_sheet.dart';
import '../widgets/conti_pdf_builder.dart';
import '../widgets/conti_song_row.dart';
import '../widgets/edit_conti_info_sheet.dart';
import 'package:go_router/go_router.dart';
import '../../auth/providers/auth_provider.dart';

class ContiDetailScreen extends ConsumerStatefulWidget {
  final String contiId;
  const ContiDetailScreen({super.key, required this.contiId});

  @override
  ConsumerState<ContiDetailScreen> createState() => _ContiDetailScreenState();
}

class _ContiDetailScreenState extends ConsumerState<ContiDetailScreen> {
  ContiDetail? _conti;
  bool _loading = true;
  String? _error;
  bool _sharingPdf = false;
  bool _cloning = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await dio.get('contis/${widget.contiId}');
      setState(() {
        _conti = ContiDetail.fromJson(res.data as Map<String, dynamic>);
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _removeSong(String contiSongId) async {
    try {
      await dio.delete('contis/${widget.contiId}/songs/$contiSongId');
      await _load();
      ref.invalidate(contisProvider);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('삭제에 실패했습니다.')));
    }
  }

  Future<void> _move(int index, int direction) async {
    final conti = _conti;
    if (conti == null) return;
    final songs = [...conti.songs];
    final target = index + direction;
    if (target < 0 || target >= songs.length) return;
    final tmp = songs[index];
    songs[index] = songs[target];
    songs[target] = tmp;
    setState(() {
      _conti = ContiDetail(id: conti.id, title: conti.title, description: conti.description, worshipDate: conti.worshipDate, songs: songs);
    });
    try {
      await dio.patch('contis/${widget.contiId}/songs', data: {'songIds': songs.map((s) => s.id).toList()});
      ref.invalidate(contisProvider);
    } catch (_) {
      await _load();
    }
  }

  Future<void> _sharePdf() async {
    final conti = _conti;
    if (conti == null) return;
    setState(() => _sharingPdf = true);
    try {
      await shareContiPdf(conti);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('PDF 공유 실패: $e')));
    } finally {
      if (mounted) setState(() => _sharingPdf = false);
    }
  }

  void _showEditInfo() {
    if (_conti == null) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => EditContiInfoSheet(
        contiId: widget.contiId,
        conti: _conti!,
        onSaved: () async { await _load(); ref.invalidate(contisProvider); },
      ),
    );
  }

  void _showAddSong() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AddSongSheet(
        contiId: widget.contiId,
        addedSongIds: _conti?.songs.map((s) => s.songId).toSet() ?? {},
        onAdded: () async { await _load(); ref.invalidate(contisProvider); },
      ),
    );
  }

  Future<void> _clone() async {
    setState(() => _cloning = true);
    try {
      final cloned = await ref.read(contisProvider.notifier).clone(widget.contiId);
      if (!mounted) return;
      if (cloned == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('복제에 실패했습니다.')));
      } else {
        context.go('/contis/${cloned.id}');
      }
    } finally {
      if (mounted) setState(() => _cloning = false);
    }
  }

  Future<void> _confirmRemove(ContiSongItem item) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('찬양 제거'),
        content: Text('"${item.song.title}"을 목록에서 제거할까요?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('제거'),
          ),
        ],
      ),
    );
    if (confirmed == true) await _removeSong(item.id);
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final auth = ref.watch(authProvider);
    final myUserId = auth.user?.id;
    final isOwner = _conti?.createdBy != null && _conti!.createdBy == myUserId;

    return Scaffold(
      appBar: AppBar(
        leading: Padding(
          padding: const EdgeInsets.all(10),
          child: Image.asset('assets/images/logo.png', fit: BoxFit.contain),
        ),
        title: const Text('콘티 편집', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        actions: [
          if (_conti != null && !isOwner)
            _cloning
                ? const Padding(
                    padding: EdgeInsets.all(14),
                    child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                  )
                : IconButton(
                    icon: const Icon(Icons.copy_outlined),
                    tooltip: '내 콘티로 복제',
                    onPressed: _clone,
                  ),
          if (_conti != null && _conti!.songs.isNotEmpty)
            _sharingPdf
                ? const Padding(
                    padding: EdgeInsets.all(14),
                    child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                  )
                : IconButton(icon: const Icon(Icons.share_outlined), tooltip: 'PDF 공유', onPressed: _sharePdf),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: TextStyle(color: cs.error)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _ContiInfoCard(conti: _conti!, onEdit: _showEditInfo, cs: cs),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('찬양 목록 (${_conti!.songs.length}곡)', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                          FilledButton.icon(
                            onPressed: _showAddSong,
                            icon: const Icon(Icons.add, size: 16),
                            label: const Text('추가'),
                            style: FilledButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              textStyle: const TextStyle(fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (_conti!.songs.isEmpty)
                        _EmptyState(onAdd: _showAddSong, cs: cs)
                      else
                        ...(_conti!.songs.asMap().entries.map((entry) {
                          final i = entry.key;
                          final item = entry.value;
                          return ContiSongRow(
                            key: ValueKey(item.id),
                            index: i,
                            item: item,
                            contiId: widget.contiId,
                            total: _conti!.songs.length,
                            onMoveUp: i > 0 ? () => _move(i, -1) : null,
                            onMoveDown: i < _conti!.songs.length - 1 ? () => _move(i, 1) : null,
                            onDelete: () => _confirmRemove(item),
                            onSheetChanged: () async { await _load(); ref.invalidate(contisProvider); },
                          );
                        })),
                    ],
                  ),
                ),
    );
  }
}

class _ContiInfoCard extends StatelessWidget {
  final ContiDetail conti;
  final VoidCallback onEdit;
  final ColorScheme cs;

  const _ContiInfoCard({required this.conti, required this.onEdit, required this.cs});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cs.outline.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(conti.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                if (conti.worshipDate != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    '${conti.worshipDate!.year}년 ${conti.worshipDate!.month}월 ${conti.worshipDate!.day}일',
                    style: const TextStyle(fontSize: 13, color: Color(0xFF7C3AED), fontWeight: FontWeight.w500),
                  ),
                ],
                if (conti.description != null && conti.description!.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(conti.description!, style: TextStyle(fontSize: 13, color: cs.onSurface.withValues(alpha: 0.5))),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: onEdit,
            child: Container(
              color: Colors.transparent,
              padding: const EdgeInsets.all(8),
              child: Icon(Icons.edit_outlined, size: 20, color: cs.onSurface.withValues(alpha: 0.5)),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onAdd;
  final ColorScheme cs;

  const _EmptyState({required this.onAdd, required this.cs});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 32),
      decoration: BoxDecoration(
        border: Border.all(color: cs.outline.withValues(alpha: 0.3)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Column(
          children: [
            Text('아직 찬양이 없습니다.', style: TextStyle(color: cs.onSurface.withValues(alpha: 0.4))),
            const SizedBox(height: 8),
            TextButton(onPressed: onAdd, child: const Text('찬양 추가하기')),
          ],
        ),
      ),
    );
  }
}
