import 'package:flutter/material.dart';
import '../../../core/api_client.dart';
import '../models/conti_detail.dart';

const _kKeys = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
  'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm',
];

class EditContiSongSheet extends StatefulWidget {
  final String contiId;
  final ContiSongItem item;
  final Future<void> Function() onSaved;

  const EditContiSongSheet({
    super.key,
    required this.contiId,
    required this.item,
    required this.onSaved,
  });

  @override
  State<EditContiSongSheet> createState() => _EditContiSongSheetState();
}

class _EditContiSongSheetState extends State<EditContiSongSheet> {
  late final TextEditingController _tempoCtrl;
  late final TextEditingController _noteCtrl;
  String _selectedKey = '';
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _selectedKey = widget.item.key ?? '';
    _tempoCtrl = TextEditingController(text: widget.item.tempo?.toString() ?? '');
    _noteCtrl = TextEditingController(text: widget.item.note ?? '');
  }

  @override
  void dispose() {
    _tempoCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await dio.patch('contis/${widget.contiId}/songs/${widget.item.id}', data: {
        'key': _selectedKey.isNotEmpty ? _selectedKey : null,
        'tempo': _tempoCtrl.text.isNotEmpty ? int.tryParse(_tempoCtrl.text) : null,
        'note': _noteCtrl.text.trim().isNotEmpty ? _noteCtrl.text.trim() : null,
      });
      if (mounted) Navigator.pop(context);
      await widget.onSaved();
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('수정에 실패했습니다.')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final bottom = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + bottom),
      decoration: BoxDecoration(color: cs.surface, borderRadius: BorderRadius.circular(24)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40, height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(color: cs.outline.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(2)),
            ),
          ),
          Text('"${widget.item.song.title}" 설정 수정',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
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
                    DropdownMenuItem(value: '', child: Text('기본 (${widget.item.song.defaultKey ?? '없음'})')),
                    ..._kKeys.map((k) => DropdownMenuItem(value: k, child: Text(k))),
                  ],
                  onChanged: (v) => setState(() => _selectedKey = v ?? ''),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _tempoCtrl,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: '템포 (BPM)',
                    hintText: widget.item.song.tempo != null ? '기본: ${widget.item.song.tempo}' : '예) 120',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _noteCtrl,
            decoration: InputDecoration(
              labelText: '송폼 / 메모',
              hintText: '예) 간주 후 반복',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('취소'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: _saving ? null : _save,
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF7C3AED),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _saving
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('저장'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
