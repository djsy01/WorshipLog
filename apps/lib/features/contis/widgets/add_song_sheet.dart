import 'package:flutter/material.dart';
import '../../../core/api_client.dart';

const _kKeys = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
  'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm',
];

class AddSongSheet extends StatefulWidget {
  final String contiId;
  final Set<String> addedSongIds;
  final Future<void> Function() onAdded;

  const AddSongSheet({
    super.key,
    required this.contiId,
    required this.addedSongIds,
    required this.onAdded,
  });

  @override
  State<AddSongSheet> createState() => _AddSongSheetState();
}

class _AddSongSheetState extends State<AddSongSheet> {
  List<Map<String, dynamic>> _songs = [];
  bool _loading = true;
  String _search = '';
  Map<String, dynamic>? _selected;
  String _selectedKey = '';
  String _note = '';
  bool _adding = false;

  @override
  void initState() {
    super.initState();
    _loadSongs();
  }

  Future<void> _loadSongs() async {
    try {
      final res = await dio.get('songs');
      setState(() {
        _songs = List<Map<String, dynamic>>.from(res.data as List);
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _showCreateSong({String initialTitle = ''}) async {
    final titleCtrl = TextEditingController(text: initialTitle);
    final artistCtrl = TextEditingController();
    final tempoCtrl = TextEditingController();
    String? selectedKey;

    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: const Text('새 찬양 등록'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: '곡명 *')),
              const SizedBox(height: 8),
              TextField(controller: artistCtrl, decoration: const InputDecoration(labelText: '아티스트 / 찬양팀 *')),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: selectedKey,
                decoration: const InputDecoration(labelText: '기본 키'),
                items: [
                  const DropdownMenuItem(value: null, child: Text('선택 안함')),
                  ..._kKeys.map((k) => DropdownMenuItem(value: k, child: Text(k))),
                ],
                onChanged: (v) => setDlg(() => selectedKey = v),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: tempoCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'BPM'),
              ),
            ]),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('취소')),
            FilledButton(
              onPressed: () {
                if (titleCtrl.text.trim().isEmpty || artistCtrl.text.trim().isEmpty) return;
                Navigator.pop(ctx, {
                  'title': titleCtrl.text.trim(),
                  'artist': artistCtrl.text.trim(),
                  if (selectedKey case final k?) 'defaultKey': k,
                  if (tempoCtrl.text.isNotEmpty && int.tryParse(tempoCtrl.text) != null)
                    'tempo': int.parse(tempoCtrl.text),
                  'isPublic': true,
                });
              },
              child: const Text('등록'),
            ),
          ],
        ),
      ),
    );

    if (result == null || !mounted) return;
    try {
      final res = await dio.post('songs', data: result);
      final song = Map<String, dynamic>.from(res.data as Map);
      setState(() {
        _songs.insert(0, song);
        _selected = song;
        _selectedKey = song['defaultKey'] as String? ?? '';
        _search = '';
      });
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('등록 실패: $e')));
    }
  }

  Future<void> _add() async {
    final sel = _selected;
    if (sel == null) return;
    setState(() => _adding = true);
    try {
      await dio.post('contis/${widget.contiId}/songs', data: {
        'songId': sel['id'],
        if (_selectedKey.isNotEmpty) 'key': _selectedKey,
        if (_note.trim().isNotEmpty) 'note': _note.trim(),
      });
      if (mounted) Navigator.pop(context);
      await widget.onAdded();
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('추가에 실패했습니다.')));
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  List<Map<String, dynamic>> get _filtered => _songs.where((s) {
        final q = _search.toLowerCase();
        return q.isEmpty ||
            (s['title'] as String).toLowerCase().contains(q) ||
            ((s['artist'] as String?) ?? '').toLowerCase().contains(q);
      }).toList();

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    final filtered = _filtered;

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      padding: EdgeInsets.fromLTRB(0, 0, 0, bottom),
      decoration: BoxDecoration(color: cs.surface, borderRadius: BorderRadius.circular(24)),
      height: MediaQuery.of(context).size.height * 0.82,
      child: Column(
        children: [
          Center(
            child: Container(
              width: 40, height: 4,
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              decoration: BoxDecoration(color: cs.outline.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(2)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                const Text('찬양 추가', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const Spacer(),
                TextButton.icon(
                  onPressed: () => _showCreateSong(),
                  icon: const Icon(Icons.add, size: 16),
                  label: const Text('새 찬양 등록', style: TextStyle(fontSize: 13)),
                ),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: TextField(
              autofocus: true,
              decoration: InputDecoration(
                hintText: '곡명, 아티스트 검색',
                prefixIcon: const Icon(Icons.search, size: 20),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
              onChanged: (v) => setState(() { _search = v; _selected = null; }),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _search.isEmpty ? '등록된 찬양이 없습니다.' : '검색 결과가 없습니다.',
                              style: TextStyle(color: cs.onSurface.withValues(alpha: 0.4), fontSize: 14),
                            ),
                            const SizedBox(height: 12),
                            FilledButton.icon(
                              onPressed: () => _showCreateSong(initialTitle: _search),
                              icon: const Icon(Icons.add, size: 16),
                              label: Text(_search.isEmpty ? '새 찬양 등록하기' : '"$_search" 등록하기'),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: filtered.length,
                    itemBuilder: (context, i) {
                      final song = filtered[i];
                      final alreadyAdded = widget.addedSongIds.contains(song['id']);
                      final isSelected = _selected?['id'] == song['id'];
                      return ListTile(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        tileColor: isSelected ? const Color(0xFF7C3AED).withValues(alpha: 0.08) : null,
                        title: Text(song['title'] as String,
                            style: TextStyle(fontSize: 14, color: alreadyAdded ? cs.onSurface.withValues(alpha: 0.3) : null)),
                        subtitle: song['artist'] != null
                            ? Text(song['artist'] as String,
                                style: TextStyle(fontSize: 12, color: alreadyAdded ? cs.onSurface.withValues(alpha: 0.2) : cs.onSurface.withValues(alpha: 0.5)))
                            : null,
                        trailing: alreadyAdded
                            ? Text('추가됨', style: TextStyle(fontSize: 12, color: cs.onSurface.withValues(alpha: 0.3)))
                            : isSelected
                                ? Icon(Icons.check_circle, color: cs.primary, size: 20)
                                : null,
                        onTap: alreadyAdded
                            ? null
                            : () => setState(() {
                                  _selected = song;
                                  _selectedKey = song['defaultKey'] as String? ?? '';
                                }),
                      );
                    },
                  ),
          ),
          if (_selected != null)
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              decoration: BoxDecoration(border: Border(top: BorderSide(color: cs.outline.withValues(alpha: 0.2)))),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('"${_selected!['title']}" 설정',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: cs.primary)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _selectedKey.isEmpty ? '' : _selectedKey,
                          decoration: InputDecoration(
                            labelText: '키',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                          items: [
                            DropdownMenuItem(value: '', child: Text('기본 (${_selected!['defaultKey'] ?? '없음'})')),
                            ..._kKeys.map((k) => DropdownMenuItem(value: k, child: Text(k))),
                          ],
                          onChanged: (v) => setState(() => _selectedKey = v ?? ''),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          decoration: InputDecoration(
                            labelText: '송폼',
                            hintText: '예) 간주 후 반복',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                          onChanged: (v) => setState(() => _note = v),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _selected == null || _adding ? null : _add,
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _adding
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(_selected != null ? '"${_selected!['title']}" 추가하기' : '곡을 선택하세요', style: const TextStyle(fontSize: 14)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
