import 'dart:io';
import 'package:dio/dio.dart' show FormData, MultipartFile;
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import '../../../core/api_client.dart';
import '../models/conti_detail.dart';
import 'conti_sheet_viewer.dart';
import 'edit_conti_song_sheet.dart';

class ContiSongRow extends StatefulWidget {
  final int index;
  final ContiSongItem item;
  final String contiId;
  final int total;
  final VoidCallback? onMoveUp;
  final VoidCallback? onMoveDown;
  final VoidCallback onDelete;
  final Future<void> Function() onSheetChanged;

  const ContiSongRow({
    super.key,
    required this.index,
    required this.item,
    required this.contiId,
    required this.total,
    this.onMoveUp,
    this.onMoveDown,
    required this.onDelete,
    required this.onSheetChanged,
  });

  @override
  State<ContiSongRow> createState() => _ContiSongRowState();
}

class _ContiSongRowState extends State<ContiSongRow> {
  bool _showSheets = false;
  bool _uploading = false;

  void _showEditSong() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => EditContiSongSheet(
        contiId: widget.contiId,
        item: widget.item,
        onSaved: widget.onSheetChanged,
      ),
    );
  }

  Future<void> _uploadSheet() async {
    if (!mounted) return;
    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('사진에서 선택 (여러 장 가능)'),
              onTap: () => Navigator.pop(ctx, 'image'),
            ),
            ListTile(
              leading: const Icon(Icons.picture_as_pdf_outlined),
              title: const Text('PDF 파일 선택'),
              onTap: () => Navigator.pop(ctx, 'pdf'),
            ),
          ],
        ),
      ),
    );
    if (choice == null) return;

    FilePickerResult? result;
    if (choice == 'image') {
      result = await FilePicker.platform.pickFiles(type: FileType.image, allowMultiple: true, withData: true);
    } else {
      result = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: ['pdf'], withData: true);
    }
    if (result == null || result.files.isEmpty) return;

    setState(() => _uploading = true);
    try {
      for (final pf in result.files) {
        final bytes = pf.bytes ?? (pf.path != null ? await File(pf.path!).readAsBytes() : null);
        if (bytes == null) continue;
        await dio.post(
          'contis/${widget.contiId}/songs/${widget.item.id}/sheet',
          data: FormData.fromMap({'file': MultipartFile.fromBytes(bytes, filename: pf.name)}),
        );
      }
      await widget.onSheetChanged();
      if (mounted) setState(() => _showSheets = true);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('악보 업로드에 실패했습니다.')));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _deleteSheet(String sheetId) async {
    try {
      await dio.delete('contis/${widget.contiId}/songs/${widget.item.id}/sheet/$sheetId');
      await widget.onSheetChanged();
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('악보 삭제에 실패했습니다.')));
    }
  }

  Widget _badge(String text, Color bg, Color fg) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(color: bg.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(4)),
        child: Text(text, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: fg)),
      );

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final bpm = widget.item.tempo ?? widget.item.song.tempo;
    final hasSheets = widget.item.sheets.isNotEmpty || widget.item.song.sheetMusicUrl != null;
    final displayKey = widget.item.key ?? widget.item.song.defaultKey;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cs.outline.withValues(alpha: 0.25)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: _showEditSong,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                child: Row(
                  children: [
                    SizedBox(
                      width: 28,
                      child: Text('${widget.index + 1}',
                          style: TextStyle(fontWeight: FontWeight.bold, color: cs.onSurface.withValues(alpha: 0.3), fontSize: 13),
                          textAlign: TextAlign.center),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            spacing: 6,
                            crossAxisAlignment: WrapCrossAlignment.end,
                            children: [
                              Text(widget.item.song.title,
                                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                              if (widget.item.song.artist != null)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 1.5),
                                  child: Text(widget.item.song.artist!,
                                      style: TextStyle(fontSize: 12, color: cs.onSurface.withValues(alpha: 0.5))),
                                ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Wrap(
                            spacing: 4, runSpacing: 4,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              if (displayKey != null && displayKey.isNotEmpty)
                                _badge(displayKey, const Color(0xFF7C3AED), const Color(0xFF7C3AED)),
                              if (bpm != null) _badge('$bpm BPM', Colors.orange, Colors.orange),
                              if (hasSheets)
                                GestureDetector(
                                  onTap: () => setState(() => _showSheets = !_showSheets),
                                  child: _badge(
                                    _showSheets
                                        ? '악보 닫기'
                                        : widget.item.sheets.isNotEmpty
                                            ? '악보보기 ${widget.item.sheets.length}장'
                                            : '악보보기',
                                    Colors.green,
                                    Colors.green,
                                  ),
                                ),
                              if (widget.item.note != null && widget.item.note!.isNotEmpty)
                                _badge(widget.item.note!, Colors.grey, cs.onSurface.withValues(alpha: 0.7)),
                              _uploading
                                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 1.5))
                                  : GestureDetector(
                                      onTap: _uploadSheet,
                                      child: _badge('+ 악보추가', Colors.blue, Colors.blue),
                                    ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Column(
                      children: [
                        SizedBox(
                          width: 28, height: 28,
                          child: IconButton(
                            padding: EdgeInsets.zero,
                            icon: Icon(Icons.keyboard_arrow_up, size: 18,
                                color: widget.onMoveUp != null
                                    ? cs.onSurface.withValues(alpha: 0.5)
                                    : cs.onSurface.withValues(alpha: 0.15)),
                            onPressed: widget.onMoveUp,
                          ),
                        ),
                        SizedBox(
                          width: 28, height: 28,
                          child: IconButton(
                            padding: EdgeInsets.zero,
                            icon: Icon(Icons.keyboard_arrow_down, size: 18,
                                color: widget.onMoveDown != null
                                    ? cs.onSurface.withValues(alpha: 0.5)
                                    : cs.onSurface.withValues(alpha: 0.15)),
                            onPressed: widget.onMoveDown,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(
                      width: 32, height: 32,
                      child: IconButton(
                        padding: EdgeInsets.zero,
                        icon: Icon(Icons.close, size: 16, color: cs.onSurface.withValues(alpha: 0.3)),
                        onPressed: widget.onDelete,
                      ),
                    ),
                  ],
                ),
              ),
              if (_showSheets)
                ContiSheetViewer(
                  sheets: widget.item.sheets,
                  defaultSheetUrl: widget.item.song.sheetMusicUrl,
                  onDelete: _deleteSheet,
                  cs: cs,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
