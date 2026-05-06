import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/songs_provider.dart';
import '../models/song.dart';
import 'song_widgets.dart';

class SongEditSheet extends ConsumerStatefulWidget {
  final Song song;
  const SongEditSheet({super.key, required this.song});

  @override
  ConsumerState<SongEditSheet> createState() => _SongEditSheetState();
}

class _SongEditSheetState extends ConsumerState<SongEditSheet> {
  late final TextEditingController _titleCtrl;
  late final TextEditingController _artistCtrl;
  late final TextEditingController _tempoCtrl;
  late final TextEditingController _scriptureCtrl;
  late final TextEditingController _lyricsCtrl;
  String? _selectedKey;
  PlatformFile? _sheetFile;
  Uint8List? _sheetBytes;
  bool _removeSheet = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _titleCtrl = TextEditingController(text: widget.song.title);
    _artistCtrl = TextEditingController(text: widget.song.artist ?? '');
    _tempoCtrl = TextEditingController(text: widget.song.tempo?.toString() ?? '');
    _scriptureCtrl = TextEditingController(text: widget.song.scriptureRef ?? '');
    _lyricsCtrl = TextEditingController(text: widget.song.lyrics ?? '');
    _selectedKey = widget.song.defaultKey;
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _artistCtrl.dispose();
    _tempoCtrl.dispose();
    _scriptureCtrl.dispose();
    _lyricsCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_titleCtrl.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      final data = <String, dynamic>{'title': _titleCtrl.text.trim()};
      if (_artistCtrl.text.trim().isNotEmpty) data['artist'] = _artistCtrl.text.trim();
      if (_selectedKey != null && _selectedKey!.isNotEmpty) data['defaultKey'] = _selectedKey;
      if (_tempoCtrl.text.isNotEmpty) {
        final tempo = int.tryParse(_tempoCtrl.text);
        if (tempo != null) data['tempo'] = tempo;
      }
      if (_scriptureCtrl.text.isNotEmpty) data['scriptureRef'] = _scriptureCtrl.text.trim();
      if (_lyricsCtrl.text.isNotEmpty) data['lyrics'] = _lyricsCtrl.text.trim();

      Song updated = await ref.read(songsProvider.notifier).updateSong(widget.song.id, data);

      if (_removeSheet && updated.sheetMusicUrl != null) {
        updated = await ref.read(songsProvider.notifier).deleteSheet(updated.id);
      }
      if (_sheetFile != null) {
        updated = await ref.read(songsProvider.notifier).uploadSheet(
              updated.id,
              fileName: _sheetFile!.name,
              filePath: _sheetFile!.path,
              bytes: _sheetBytes,
            );
      }
      if (mounted) Navigator.pop(context, updated);
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('수정 실패: $e')));
      }
    }
  }

  Future<void> _pickSheet() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
      withData: true,
    );
    final file = result?.files.single;
    if (file == null) return;
    setState(() {
      _sheetFile = file;
      _sheetBytes = file.bytes;
      _removeSheet = false;
    });
  }

  Future<void> _openCurrentSheet(BuildContext context) async {
    final url = widget.song.sheetMusicUrl;
    if (url == null || url.isEmpty) return;
    final messenger = ScaffoldMessenger.of(context);
    final opened = await launchSheetUrl(url);
    if (!opened) messenger.showSnackBar(const SnackBar(content: Text('악보를 열 수 없습니다.')));
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final canSave = _titleCtrl.text.trim().isNotEmpty;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.92),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1F2937) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 36, height: 4,
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(color: cs.outline.withValues(alpha: 0.4), borderRadius: BorderRadius.circular(2)),
                      ),
                    ),
                    const Text('찬양 수정', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    TextField(controller: _titleCtrl, onChanged: (_) => setState(() {}), decoration: const InputDecoration(labelText: '곡명 *')),
                    const SizedBox(height: 12),
                    TextField(controller: _artistCtrl, onChanged: (_) => setState(() {}), decoration: const InputDecoration(labelText: '아티스트 / 찬양팀')),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _selectedKey,
                            decoration: const InputDecoration(labelText: '키'),
                            items: [
                              const DropdownMenuItem(value: null, child: Text('선택 안함')),
                              ...kSongKeys.map((k) => DropdownMenuItem(value: k, child: Text(k))),
                            ],
                            onChanged: (v) => setState(() => _selectedKey = v),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(controller: _tempoCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'BPM')),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(controller: _scriptureCtrl, decoration: const InputDecoration(labelText: '말씀 구절 (예: 시 23:1)')),
                    const SizedBox(height: 12),
                    TextField(controller: _lyricsCtrl, maxLines: 5, decoration: const InputDecoration(labelText: '가사', alignLabelWithHint: true)),
                    const SizedBox(height: 16),
                    SongSheetPickerCard(
                      currentUrl: widget.song.sheetMusicUrl,
                      selectedFileName: _sheetFile?.name,
                      removeCurrent: _removeSheet,
                      onOpenCurrent: () => _openCurrentSheet(context),
                      onPick: _pickSheet,
                      onClearPicked: () => setState(() { _sheetFile = null; _sheetBytes = null; }),
                      onToggleRemove: widget.song.sheetMusicUrl == null
                          ? null
                          : () => setState(() {
                                _removeSheet = !_removeSheet;
                                if (_removeSheet) { _sheetFile = null; _sheetBytes = null; }
                              }),
                    ),
                  ],
                ),
              ),
            ),
            SafeArea(
              top: false,
              child: Container(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 16),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1F2937) : Colors.white,
                  border: Border(top: BorderSide(color: cs.outline.withValues(alpha: 0.2))),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _saving ? null : () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                        child: const Text('취소'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton(
                        onPressed: (canSave && !_saving) ? _save : null,
                        style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                        child: _saving
                            ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('수정하기'),
                      ),
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

class SongSheetPickerCard extends StatelessWidget {
  final String? currentUrl;
  final String? selectedFileName;
  final bool removeCurrent;
  final VoidCallback onOpenCurrent;
  final VoidCallback onPick;
  final VoidCallback onClearPicked;
  final VoidCallback? onToggleRemove;

  const SongSheetPickerCard({
    super.key,
    required this.currentUrl,
    required this.selectedFileName,
    required this.removeCurrent,
    required this.onOpenCurrent,
    required this.onPick,
    required this.onClearPicked,
    required this.onToggleRemove,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final hasCurrent = currentUrl != null && currentUrl!.isNotEmpty;
    final hasPicked = selectedFileName != null;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cs.outline.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('악보 (PDF / 이미지)',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: cs.onSurface.withValues(alpha: 0.65))),
          if (hasCurrent && !hasPicked) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: cs.surfaceContainerHighest.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextButton.icon(
                      onPressed: removeCurrent ? null : onOpenCurrent,
                      icon: const Icon(Icons.open_in_new_rounded, size: 16),
                      label: Text(removeCurrent ? '삭제 예정' : '현재 악보 보기'),
                      style: TextButton.styleFrom(alignment: Alignment.centerLeft, padding: EdgeInsets.zero),
                    ),
                  ),
                  TextButton(onPressed: onToggleRemove, child: Text(removeCurrent ? '삭제 취소' : '삭제')),
                ],
              ),
            ),
          ],
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: removeCurrent ? null : onPick,
            icon: const Icon(Icons.upload_file_rounded, size: 18),
            label: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                hasPicked ? selectedFileName! : hasCurrent ? '악보 교체' : '악보 업로드',
                overflow: TextOverflow.ellipsis,
              ),
            ),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(44),
              alignment: Alignment.centerLeft,
              side: BorderSide(color: cs.outline.withValues(alpha: 0.45)),
            ),
          ),
          if (hasPicked) ...[
            const SizedBox(height: 4),
            TextButton(onPressed: onClearPicked, child: const Text('선택 취소')),
          ],
        ],
      ),
    );
  }
}
