import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api_client.dart';
import '../../contis/models/conti.dart';

class RoomContiTab extends StatefulWidget {
  final String roomId;
  const RoomContiTab({super.key, required this.roomId});

  @override
  State<RoomContiTab> createState() => _RoomContiTabState();
}

class _RoomContiTabState extends State<RoomContiTab> {
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
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
                                  color:
                                      cs.onSurface.withValues(alpha: 0.5))),
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
                                  color:
                                      cs.onSurface.withValues(alpha: 0.5)),
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
