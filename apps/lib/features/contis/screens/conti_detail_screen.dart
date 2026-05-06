import 'dart:io';
import 'package:dio/dio.dart'
    show Options, ResponseType, FormData, MultipartFile, Dio, BaseOptions;
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import '../../../core/api_client.dart';
import '../models/conti_detail.dart';
import '../providers/contis_provider.dart';

const _keys = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
  'Cm',
  'Dm',
  'Em',
  'Fm',
  'Gm',
  'Am',
  'Bm',
];

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

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await dio.get('contis/${widget.contiId}');
      setState(() {
        _conti = ContiDetail.fromJson(res.data as Map<String, dynamic>);
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _removeSong(String contiSongId) async {
    try {
      await dio.delete('contis/${widget.contiId}/songs/$contiSongId');
      await _load();
      ref.invalidate(contisProvider);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('삭제에 실패했습니다.')));
      }
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
      _conti = ContiDetail(
        id: conti.id,
        title: conti.title,
        description: conti.description,
        worshipDate: conti.worshipDate,
        songs: songs,
      );
    });
    try {
      await dio.patch(
        'contis/${widget.contiId}/songs',
        data: {'songIds': songs.map((s) => s.id).toList()},
      );
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
      final ttf = await PdfGoogleFonts.nanumGothicRegular();
      final ttfBold = await PdfGoogleFonts.nanumGothicBold();
      final doc = pw.Document(
        theme: pw.ThemeData.withFont(base: ttf, bold: ttfBold),
      );

      // 앱 내부 인증 토큰(Interceptor)이 외부 스토리지 요청을 방해하지 않도록
      // 순수한 Dio 인스턴스를 생성하여 이미지를 다운로드합니다.
      final plainDio = Dio();
      final songImages = <List<pw.ImageProvider>>[];
      final errorMsgs = <List<String>>[];

      for (int i = 0; i < conti.songs.length; i++) {
        final cs = conti.songs[i];
        final urls = <String>[];

        if (cs.sheets.isNotEmpty) {
          urls.addAll(cs.sheets.map((s) => s.url));
        } else if (cs.song.sheetMusicUrl != null) {
          urls.add(cs.song.sheetMusicUrl!);
        }

        final imgs = <pw.ImageProvider>[];
        final errors = <String>[];

        for (final url in urls) {
          try {
            String targetUrl = url;
            if (url.startsWith('//')) {
              targetUrl = 'https:$url';
            } else if (url.startsWith('/')) {
              final uri = Uri.parse(dio.options.baseUrl);
              targetUrl =
                  '${uri.scheme}://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}$url';
            }

            final res = await plainDio.get<List<int>>(
              targetUrl,
              options: Options(
                responseType: ResponseType.bytes,
                validateStatus: (status) => true,
              ),
            );

            if (res.statusCode == 200 && res.data != null) {
              try {
                final bytes = Uint8List.fromList(res.data!);
                if (targetUrl.toLowerCase().contains('.pdf')) {
                  // PDF 악보를 고해상도 이미지로 변환하여 순서대로 삽입
                  await for (final page in Printing.raster(bytes, dpi: 150)) {
                    final pngBytes = await page.toPng();
                    imgs.add(pw.MemoryImage(pngBytes));
                  }
                } else {
                  // WEBP 등 다양한 포맷 지원을 위해 Flutter 기본 디코더 사용
                  try {
                    final provider = await flutterImageProvider(
                      MemoryImage(bytes),
                    );
                    imgs.add(provider);
                  } catch (e) {
                    // Fallback
                    imgs.add(pw.MemoryImage(bytes));
                  }
                }
              } catch (e) {
                errors.add('악보 변환 실패: $e');
              }
            } else {
              errors.add('악보 다운 실패 (HTTP ${res.statusCode}): $targetUrl');
            }
          } catch (e) {
            errors.add('네트워크 에러: $e');
          }
        }
        songImages.add(imgs);
        errorMsgs.add(errors);
      }

      // PDF 레이아웃: 클라이언트 웹 인쇄(Print) 표 양식 100% 동일 구현
      if (conti.songs.isEmpty) {
        doc.addPage(
          pw.Page(
            pageFormat: PdfPageFormat.a4,
            build: (ctx) => pw.Center(
              child: pw.Text(
                '찬양이 없습니다.',
                style: pw.TextStyle(font: ttf, fontSize: 16),
              ),
            ),
          ),
        );
      } else {
        for (int i = 0; i < conti.songs.length; i++) {
          final cs = conti.songs[i];
          final bpm = cs.tempo ?? cs.song.tempo;
          final key = cs.key ?? cs.song.defaultKey;

          // 테이블 선 색상 등 변수를 먼저 선언 (header에서 사용하기 위함)
          const borderColor = PdfColor.fromInt(0xFFD1D5DB);
          final borderSide = const pw.BorderSide(color: borderColor, width: 1);
          final hasArtist =
              cs.song.artist != null && cs.song.artist!.isNotEmpty;

          // 테이블 2 (송폼) 데이터 준비
          final songFormItems = <String>[];
          if (cs.note != null && cs.note!.isNotEmpty) {
            songFormItems.add(cs.note!);
          }

          // 웹의 pageBreakBefore: 'always' 처럼 곡마다 페이지를 넘김
          doc.addPage(
            pw.MultiPage(
              pageFormat: PdfPageFormat.a4,
              margin: const pw.EdgeInsets.all(32),
              // header 속성을 사용하면, 악보가 2페이지 이상 넘어가도 매 페이지 상단에 표가 반복 노출됩니다.
              header: (ctx) {
                return pw.Column(
                  mainAxisSize: pw.MainAxisSize.min,
                  children: [
                    // 콘티 제목 & 날짜
                    pw.Container(
                      alignment: pw.Alignment.center,
                      margin: const pw.EdgeInsets.only(bottom: 10),
                      child: pw.Column(
                        children: [
                          pw.Text(
                            conti.title,
                            style: pw.TextStyle(
                              font: ttf,
                              fontSize: 18,
                              fontWeight: pw.FontWeight.bold,
                              color: const PdfColor.fromInt(0xFF111111),
                            ),
                          ),
                          if (conti.worshipDate != null) ...[
                            pw.SizedBox(height: 2),
                            pw.Text(
                              '${conti.worshipDate!.year}년 ${conti.worshipDate!.month}월 ${conti.worshipDate!.day}일',
                              style: pw.TextStyle(
                                font: ttf,
                                fontSize: 13,
                                color: const PdfColor.fromInt(0xFF7C3AED),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    // 테이블 1 (기본 정보)
                    pw.Table(
                      border: pw.TableBorder.all(color: borderColor, width: 1),
                      columnWidths: {
                        0: const pw.FixedColumnWidth(44),
                        1: const pw.FlexColumnWidth(),
                        if (hasArtist) 2: const pw.FixedColumnWidth(100),
                        if (hasArtist)
                          3: const pw.FixedColumnWidth(40)
                        else
                          2: const pw.FixedColumnWidth(40),
                        if (hasArtist)
                          4: const pw.FixedColumnWidth(45)
                        else
                          3: const pw.FixedColumnWidth(45),
                        if (hasArtist)
                          5: const pw.FixedColumnWidth(55)
                        else
                          4: const pw.FixedColumnWidth(55),
                        if (hasArtist)
                          6: const pw.FixedColumnWidth(75)
                        else
                          5: const pw.FixedColumnWidth(75),
                      },
                      children: [
                        pw.TableRow(
                          children: [
                            pw.Container(
                              padding: const pw.EdgeInsets.symmetric(
                                vertical: 4,
                                horizontal: 4,
                              ),
                              alignment: pw.Alignment.center,
                              child: pw.Text(
                                '${i + 1}번',
                                style: pw.TextStyle(
                                  font: ttf,
                                  fontSize: 12,
                                  fontWeight: pw.FontWeight.bold,
                                  color: const PdfColor.fromInt(0xFF7C3AED),
                                ),
                              ),
                            ),
                            pw.Container(
                              padding: const pw.EdgeInsets.symmetric(
                                vertical: 4,
                                horizontal: 8,
                              ),
                              alignment: pw.Alignment.centerLeft,
                              child: pw.Text(
                                cs.song.title,
                                style: pw.TextStyle(
                                  font: ttf,
                                  fontSize: 13,
                                  fontWeight: pw.FontWeight.bold,
                                ),
                              ),
                            ),
                            if (hasArtist)
                              pw.Container(
                                padding: const pw.EdgeInsets.symmetric(
                                  vertical: 4,
                                  horizontal: 8,
                                ),
                                alignment: pw.Alignment.centerLeft,
                                child: pw.Text(
                                  cs.song.artist!,
                                  maxLines: 1,
                                  style: pw.TextStyle(
                                    font: ttf,
                                    fontSize: 12,
                                    color: const PdfColor.fromInt(0xFF555555),
                                  ),
                                ),
                              ),
                            pw.Container(
                              padding: const pw.EdgeInsets.symmetric(
                                vertical: 4,
                                horizontal: 4,
                              ),
                              alignment: pw.Alignment.center,
                              child: pw.Text(
                                'Key',
                                style: pw.TextStyle(
                                  font: ttf,
                                  fontSize: 12,
                                  fontWeight: pw.FontWeight.bold,
                                  color: const PdfColor.fromInt(0xFF7C3AED),
                                ),
                              ),
                            ),
                            pw.Container(
                              padding: const pw.EdgeInsets.symmetric(
                                vertical: 4,
                                horizontal: 4,
                              ),
                              alignment: pw.Alignment.center,
                              child: pw.Text(
                                (key != null && key.isNotEmpty) ? key : '-',
                                style: pw.TextStyle(
                                  font: ttf,
                                  fontSize: 12,
                                  color: const PdfColor.fromInt(0xFF333333),
                                ),
                              ),
                            ),
                            pw.Container(
                              padding: const pw.EdgeInsets.symmetric(
                                vertical: 4,
                                horizontal: 4,
                              ),
                              alignment: pw.Alignment.center,
                              child: pw.Text(
                                'tempo',
                                style: pw.TextStyle(
                                  font: ttf,
                                  fontSize: 12,
                                  fontWeight: pw.FontWeight.bold,
                                  color: const PdfColor.fromInt(0xFF7C3AED),
                                ),
                              ),
                            ),
                            pw.Container(
                              padding: const pw.EdgeInsets.symmetric(
                                vertical: 4,
                                horizontal: 8,
                              ),
                              alignment: pw.Alignment.center,
                              child: pw.Text(
                                bpm != null ? '$bpm BPM' : '-',
                                style: pw.TextStyle(
                                  font: ttf,
                                  fontSize: 12,
                                  color: const PdfColor.fromInt(0xFF333333),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    if (songFormItems.isNotEmpty)
                      pw.Table(
                        border: pw.TableBorder(
                          left: borderSide,
                          right: borderSide,
                          bottom: borderSide,
                          verticalInside: borderSide,
                        ),
                        columnWidths: {
                          0: const pw.FixedColumnWidth(44),
                          1: const pw.FlexColumnWidth(),
                        },
                        children: [
                          pw.TableRow(
                            children: [
                              pw.Container(
                                padding: const pw.EdgeInsets.symmetric(
                                  vertical: 4,
                                  horizontal: 8,
                                ),
                                alignment: pw.Alignment.center,
                                child: pw.Text(
                                  '송폼',
                                  style: pw.TextStyle(
                                    font: ttf,
                                    fontSize: 12,
                                    fontWeight: pw.FontWeight.bold,
                                    color: const PdfColor.fromInt(0xFF7C3AED),
                                  ),
                                ),
                              ),
                              pw.Container(
                                padding: const pw.EdgeInsets.symmetric(
                                  vertical: 4,
                                  horizontal: 8,
                                ),
                                alignment: pw.Alignment.centerLeft,
                                child: pw.Text(
                                  songFormItems.join('  |  '),
                                  style: pw.TextStyle(
                                    font: ttf,
                                    fontSize: 12,
                                    color: const PdfColor.fromInt(0xFF333333),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    pw.SizedBox(height: 8),
                  ],
                );
              },
              build: (ctx) {
                final widgets = <pw.Widget>[];

                if (errorMsgs[i].isNotEmpty) {
                  widgets.add(
                    pw.Container(
                      margin: const pw.EdgeInsets.only(bottom: 8),
                      padding: const pw.EdgeInsets.all(8),
                      decoration: pw.BoxDecoration(
                        color: PdfColors.red50,
                        border: pw.Border.all(color: PdfColors.red200),
                      ),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: errorMsgs[i]
                            .map(
                              (err) => pw.Text(
                                err,
                                style: pw.TextStyle(
                                  font: ttf,
                                  fontSize: 10,
                                  color: PdfColors.red600,
                                ),
                              ),
                            )
                            .toList(),
                      ),
                    ),
                  );
                }

                if (songImages[i].isEmpty && errorMsgs[i].isEmpty) {
                  widgets.add(
                    pw.Padding(
                      padding: const pw.EdgeInsets.symmetric(vertical: 12),
                      child: pw.Text(
                        '(이 곡은 등록된 악보가 없습니다.)',
                        style: pw.TextStyle(
                          font: ttf,
                          fontSize: 11,
                          color: PdfColors.grey500,
                        ),
                      ),
                    ),
                  );
                }

                for (final img in songImages[i]) {
                  widgets.add(
                    pw.Container(
                      alignment: pw.Alignment.center, // 악보 가운데 정렬
                      constraints: const pw.BoxConstraints(
                        maxHeight: 700, // 헤더 높이를 고려하여 A4에 쏙 들어가도록 축소
                      ), // 거대한 이미지 증발 방지 (A4 세로 한도 제한)
                      width: double.infinity,
                      margin: const pw.EdgeInsets.only(top: 8, bottom: 20),
                      child: pw.Image(img, fit: pw.BoxFit.contain),
                    ),
                  );
                }

                return widgets;
              },
            ),
          );
        }
      }

      final bytes = await doc.save();
      final filename =
          '${conti.title.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_')}.pdf';
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/$filename');
      await file.writeAsBytes(bytes);

      if (!mounted) return;
      final box = context.findRenderObject() as RenderBox?;
      await Share.shareXFiles(
        [XFile(file.path, mimeType: 'application/pdf')],
        subject: conti.title,
        sharePositionOrigin: box != null
            ? box.localToGlobal(Offset.zero) & box.size
            : null,
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('PDF 공유 실패: $e')));
      }
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
      builder: (_) => _EditContiInfoSheet(
        contiId: widget.contiId,
        conti: _conti!,
        onSaved: () async {
          await _load();
          ref.invalidate(contisProvider);
        },
      ),
    );
  }

  void _showAddSong() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AddSongSheet(
        contiId: widget.contiId,
        addedSongIds: _conti?.songs.map((s) => s.songId).toSet() ?? {},
        onAdded: () async {
          await _load();
          ref.invalidate(contisProvider);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        leading: Padding(
          padding: const EdgeInsets.all(10),
          child: Image.asset('assets/images/logo.png', fit: BoxFit.contain),
        ),
        title: const Text(
          '콘티 편집',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        actions: [
          if (_conti != null && _conti!.songs.isNotEmpty)
            _sharingPdf
                ? const Padding(
                    padding: EdgeInsets.all(14),
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : IconButton(
                    icon: const Icon(Icons.share_outlined),
                    tooltip: 'PDF 공유',
                    onPressed: _sharePdf,
                  ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(
              child: Text(_error!, style: TextStyle(color: cs.error)),
            )
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // 콘티 정보 카드
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 14,
                    ),
                    decoration: BoxDecoration(
                      color: cs.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: cs.outline.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _conti!.title,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              if (_conti!.worshipDate != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  '${_conti!.worshipDate!.year}년 ${_conti!.worshipDate!.month}월 ${_conti!.worshipDate!.day}일',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: Color(0xFF7C3AED),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                              if (_conti!.description != null &&
                                  _conti!.description!.isNotEmpty) ...[
                                const SizedBox(height: 6),
                                Text(
                                  _conti!.description!,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: cs.onSurface.withValues(alpha: 0.5),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: _showEditInfo,
                          child: Container(
                            color: Colors.transparent, // 터치 영역 확보
                            padding: const EdgeInsets.all(
                              8,
                            ), // 상하좌우 여백을 균일하게 하여 중앙 정렬
                            child: Icon(
                              Icons.edit_outlined,
                              size: 20,
                              color: cs.onSurface.withValues(alpha: 0.5),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 찬양 목록 헤더
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '찬양 목록 (${_conti!.songs.length}곡)',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      FilledButton.icon(
                        onPressed: _showAddSong,
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text('추가'),
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          textStyle: const TextStyle(fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  if (_conti!.songs.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 32),
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: cs.outline.withValues(alpha: 0.3),
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Column(
                          children: [
                            Text(
                              '아직 찬양이 없습니다.',
                              style: TextStyle(
                                color: cs.onSurface.withValues(alpha: 0.4),
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: _showAddSong,
                              child: const Text('찬양 추가하기'),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    ...(_conti!.songs.asMap().entries.map((entry) {
                      final i = entry.key;
                      final item = entry.value;
                      return _SongRow(
                        key: ValueKey(item.id),
                        index: i,
                        item: item,
                        contiId: widget.contiId,
                        total: _conti!.songs.length,
                        onMoveUp: i > 0 ? () => _move(i, -1) : null,
                        onMoveDown: i < _conti!.songs.length - 1
                            ? () => _move(i, 1)
                            : null,
                        onDelete: () => _confirmRemove(item),
                        onSheetChanged: () async {
                          await _load();
                          ref.invalidate(contisProvider);
                        },
                      );
                    })),
                ],
              ),
            ),
    );
  }

  Future<void> _confirmRemove(ContiSongItem item) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('찬양 제거'),
        content: Text('"${item.song.title}"을 목록에서 제거할까요?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('취소'),
          ),
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
}

// ─── 곡 행 ────────────────────────────────────────────────────────────────────

class _SongRow extends StatefulWidget {
  final int index;
  final ContiSongItem item;
  final String contiId;
  final int total;
  final VoidCallback? onMoveUp;
  final VoidCallback? onMoveDown;
  final VoidCallback onDelete;
  final Future<void> Function() onSheetChanged;

  const _SongRow({
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
  State<_SongRow> createState() => _SongRowState();
}

class _SongRowState extends State<_SongRow> {
  bool _showSheets = false;
  bool _uploading = false;

  void _showEditSong() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _EditContiSongSheet(
        contiId: widget.contiId,
        item: widget.item,
        onSaved: widget.onSheetChanged,
      ),
    );
  }

  Future<void> _uploadSheet() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
      withData: true,
    );
    if (result == null) return;
    final pf = result.files.single;
    final bytes =
        pf.bytes ??
        (pf.path != null ? await File(pf.path!).readAsBytes() : null);
    if (bytes == null) return;

    setState(() => _uploading = true);
    try {
      await dio.post(
        'contis/${widget.contiId}/songs/${widget.item.id}/sheet',
        data: FormData.fromMap({
          'file': MultipartFile.fromBytes(bytes, filename: pf.name),
        }),
      );
      await widget.onSheetChanged();
      if (mounted) setState(() => _showSheets = true);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('악보 업로드에 실패했습니다.')));
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _deleteSheet(String sheetId) async {
    try {
      await dio.delete(
        'contis/${widget.contiId}/songs/${widget.item.id}/sheet/$sheetId',
      );
      await widget.onSheetChanged();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('악보 삭제에 실패했습니다.')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final bpm = widget.item.tempo ?? widget.item.song.tempo;
    final hasSheets =
        widget.item.sheets.isNotEmpty || widget.item.song.sheetMusicUrl != null;
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
              // 메인 행
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                child: Row(
                  children: [
                    // 번호
                    SizedBox(
                      width: 28,
                      child: Text(
                        '${widget.index + 1}',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: cs.onSurface.withValues(alpha: 0.3),
                          fontSize: 13,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    const SizedBox(width: 8),

                    // 곡 정보
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            spacing: 6,
                            crossAxisAlignment: WrapCrossAlignment.end,
                            children: [
                              Text(
                                widget.item.song.title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 15,
                                ),
                              ),
                              if (widget.item.song.artist != null)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 1.5),
                                  child: Text(
                                    widget.item.song.artist!,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: cs.onSurface.withValues(
                                        alpha: 0.5,
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Wrap(
                            spacing: 4,
                            runSpacing: 4,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              if (displayKey != null && displayKey.isNotEmpty)
                                _badge(
                                  displayKey,
                                  const Color(0xFF7C3AED),
                                  const Color(0xFF7C3AED),
                                ),
                              if (bpm != null)
                                _badge(
                                  '$bpm BPM',
                                  Colors.orange,
                                  Colors.orange,
                                ),
                              if (hasSheets)
                                GestureDetector(
                                  onTap: () => setState(
                                    () => _showSheets = !_showSheets,
                                  ),
                                  child: _badge(
                                    _showSheets
                                        ? '악보 닫기'
                                        : widget.item.sheets.isNotEmpty
                                        ? '임시악보 ${widget.item.sheets.length}장'
                                        : '기본악보',
                                    Colors.green,
                                    Colors.green,
                                  ),
                                ),
                              if (widget.item.note != null &&
                                  widget.item.note!.isNotEmpty)
                                _badge(
                                  widget.item.note!,
                                  Colors.grey,
                                  cs.onSurface.withValues(alpha: 0.7),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // 악보 추가 버튼
                    _uploading
                        ? const SizedBox(
                            width: 28,
                            height: 28,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : SizedBox(
                            width: 28,
                            height: 28,
                            child: IconButton(
                              padding: EdgeInsets.zero,
                              icon: Icon(
                                Icons.add_photo_alternate_outlined,
                                size: 16,
                                color: Colors.blue.withValues(alpha: 0.7),
                              ),
                              tooltip: '악보 추가',
                              onPressed: _uploadSheet,
                            ),
                          ),

                    // 순서 버튼
                    Column(
                      children: [
                        SizedBox(
                          width: 28,
                          height: 28,
                          child: IconButton(
                            padding: EdgeInsets.zero,
                            icon: Icon(
                              Icons.keyboard_arrow_up,
                              size: 18,
                              color: widget.onMoveUp != null
                                  ? cs.onSurface.withValues(alpha: 0.5)
                                  : cs.onSurface.withValues(alpha: 0.15),
                            ),
                            onPressed: widget.onMoveUp,
                          ),
                        ),
                        SizedBox(
                          width: 28,
                          height: 28,
                          child: IconButton(
                            padding: EdgeInsets.zero,
                            icon: Icon(
                              Icons.keyboard_arrow_down,
                              size: 18,
                              color: widget.onMoveDown != null
                                  ? cs.onSurface.withValues(alpha: 0.5)
                                  : cs.onSurface.withValues(alpha: 0.15),
                            ),
                            onPressed: widget.onMoveDown,
                          ),
                        ),
                      ],
                    ),

                    // 삭제 버튼
                    SizedBox(
                      width: 32,
                      height: 32,
                      child: IconButton(
                        padding: EdgeInsets.zero,
                        icon: Icon(
                          Icons.close,
                          size: 16,
                          color: cs.onSurface.withValues(alpha: 0.3),
                        ),
                        onPressed: widget.onDelete,
                      ),
                    ),
                  ],
                ),
              ),

              // 악보 인라인 뷰어
              if (_showSheets)
                _SheetViewer(
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

  Widget _badge(String text, Color bg, Color fg) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
    decoration: BoxDecoration(
      color: bg.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(4),
    ),
    child: Text(
      text,
      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: fg),
    ),
  );
}

// ─── 악보 인라인 뷰어 ─────────────────────────────────────────────────────────

class _SheetViewer extends StatelessWidget {
  final List<ContiSheet> sheets;
  final String? defaultSheetUrl;
  final Future<void> Function(String sheetId) onDelete;
  final ColorScheme cs;

  const _SheetViewer({
    required this.sheets,
    this.defaultSheetUrl,
    required this.onDelete,
    required this.cs,
  });

  @override
  Widget build(BuildContext context) {
    final items = sheets.isNotEmpty
        ? sheets.map((s) => (id: s.id, url: s.url, deletable: true)).toList()
        : defaultSheetUrl != null
        ? [(id: '', url: defaultSheetUrl!, deletable: false)]
        : <({String id, String url, bool deletable})>[];

    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      children: items.map((item) {
        final isPdf = item.url.toLowerCase().contains('.pdf');
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Divider(height: 1, color: cs.outline.withValues(alpha: 0.2)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              child: Row(
                children: [
                  Text(
                    item.deletable ? '임시악보' : '기본악보',
                    style: TextStyle(
                      fontSize: 12,
                      color: cs.onSurface.withValues(alpha: 0.4),
                    ),
                  ),
                  const Spacer(),
                  if (item.deletable)
                    TextButton(
                      onPressed: () => onDelete(item.id),
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.red,
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                      ),
                      child: const Text('삭제', style: TextStyle(fontSize: 12)),
                    ),
                ],
              ),
            ),
            if (isPdf)
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 0, 8, 12),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      // 너비를 기준으로 A4 비율(1 : 1.414)에 맞춰 높이를 동적으로 넉넉하게 설정
                      return Container(
                        height: constraints.maxWidth * 1.414,
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: cs.outline.withValues(alpha: 0.2),
                          ),
                          color: cs.surfaceContainerHighest.withValues(
                            alpha: 0.3,
                          ),
                        ),
                        child: SfPdfViewer.network(
                          item.url,
                          canShowScrollHead: false, // 상단 스크롤 헤더 숨김 (깔끔한 UI)
                        ),
                      );
                    },
                  ),
                ),
              )
            else
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 0, 8, 12),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    item.url,
                    fit: BoxFit.contain,
                    loadingBuilder: (context, child, progress) {
                      if (progress == null) return child;
                      return const SizedBox(
                        height: 100,
                        child: Center(child: CircularProgressIndicator()),
                      );
                    },
                    errorBuilder: (context, error, stack) => Container(
                      height: 60,
                      alignment: Alignment.center,
                      child: Text(
                        '이미지를 불러올 수 없습니다.',
                        style: TextStyle(
                          fontSize: 12,
                          color: cs.onSurface.withValues(alpha: 0.4),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        );
      }).toList(),
    );
  }
}

// ─── 인라인 PDF 미리보기 및 전체화면 ──────────────────────────────────────────

class _InlinePdfPreview extends StatefulWidget {
  final String url;
  final String title;
  final ColorScheme cs;

  const _InlinePdfPreview({
    required this.url,
    required this.title,
    required this.cs,
  });

  @override
  State<_InlinePdfPreview> createState() => _InlinePdfPreviewState();
}

class _InlinePdfPreviewState extends State<_InlinePdfPreview> {
  List<Uint8List> _images = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPdfAsImages();
  }

  // PDF 뷰어의 스크롤 충돌을 근본적으로 막기 위해, PDF의 모든 페이지를 이미지로 변환하여 렌더링
  Future<void> _loadPdfAsImages() async {
    try {
      String targetUrl = widget.url;
      if (widget.url.startsWith('//')) {
        targetUrl = 'https:${widget.url}';
      } else if (widget.url.startsWith('/')) {
        final uri = Uri.parse(dio.options.baseUrl);
        targetUrl =
            '${uri.scheme}://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}${widget.url}';
      }

      final plainDio = Dio(
        BaseOptions(
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
        ),
      );

      final res = await plainDio.get<List<int>>(
        targetUrl,
        options: Options(
          responseType: ResponseType.bytes,
          validateStatus: (_) => true,
        ),
      );

      if (res.statusCode == 200 && res.data != null) {
        final bytes = Uint8List.fromList(res.data!);
        final imgs = <Uint8List>[];

        // PDF의 모든 페이지를 고화질 이미지(PNG) 리스트로 변환
        await for (final page in Printing.raster(bytes, dpi: 150)) {
          imgs.add(await page.toPng());
        }

        if (mounted) {
          setState(() {
            _images = imgs;
            _loading = false;
          });
        }
      } else {
        throw Exception('HTTP ${res.statusCode}');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = '악보를 불러오지 못했습니다.';
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Container(
        height: 200,
        width: double.infinity,
        decoration: BoxDecoration(
          border: Border.all(color: widget.cs.outline.withValues(alpha: 0.2)),
          color: widget.cs.surfaceContainerHighest.withValues(alpha: 0.3),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 12),
              Text(
                'PDF 악보 불러오는 중...',
                style: TextStyle(fontSize: 13, color: Colors.grey),
              ),
            ],
          ),
        ),
      );
    }

    if (_error != null || _images.isEmpty) {
      return Container(
        height: 100,
        width: double.infinity,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          border: Border.all(color: widget.cs.outline.withValues(alpha: 0.2)),
          color: widget.cs.surfaceContainerHighest.withValues(alpha: 0.3),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          _error ?? '렌더링된 페이지가 없습니다.',
          style: TextStyle(color: widget.cs.error),
        ),
      );
    }

    return Stack(
      children: [
        // 모든 악보 이미지를 세로로 쫙 펼쳐서 나열 (스크롤 충돌 완벽 해소)
        Column(
          children: _images.map((img) {
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              width: double.infinity,
              decoration: BoxDecoration(
                border: Border.all(
                  color: widget.cs.outline.withValues(alpha: 0.2),
                ),
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.memory(
                  img,
                  fit: BoxFit.contain,
                  width: double.infinity,
                ),
              ),
            );
          }).toList(),
        ),

        // 전체화면 보기 버튼
        Positioned(
          bottom: 16,
          right: 8,
          child: GestureDetector(
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => Scaffold(
                    appBar: AppBar(
                      title: Text(
                        widget.title,
                        style: const TextStyle(fontSize: 16),
                      ),
                    ),
                    body: SfPdfViewer.network(widget.url),
                  ),
                ),
              );
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.7),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.2),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.fullscreen, color: Colors.white, size: 18),
                  SizedBox(width: 6),
                  Text(
                    '전체화면',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ─── 콘티 정보 수정 시트 ───────────────────────────────────────────────────────

class _EditContiInfoSheet extends StatefulWidget {
  final String contiId;
  final ContiDetail conti;
  final Future<void> Function() onSaved;

  const _EditContiInfoSheet({
    required this.contiId,
    required this.conti,
    required this.onSaved,
  });

  @override
  State<_EditContiInfoSheet> createState() => _EditContiInfoSheetState();
}

class _EditContiInfoSheetState extends State<_EditContiInfoSheet> {
  late final TextEditingController _titleCtrl;
  late final TextEditingController _descCtrl;
  DateTime? _selectedDate;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _titleCtrl = TextEditingController(text: widget.conti.title);
    _descCtrl = TextEditingController(text: widget.conti.description ?? '');
    _selectedDate = widget.conti.worshipDate;
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) setState(() => _selectedDate = picked);
  }

  Future<void> _save() async {
    if (_titleCtrl.text.trim().isEmpty) return;
    setState(() => _saving = true);

    final dateStr = _selectedDate != null
        ? '${_selectedDate!.year}-${_selectedDate!.month.toString().padLeft(2, '0')}-${_selectedDate!.day.toString().padLeft(2, '0')}'
        : null;

    try {
      await dio.patch(
        'contis/${widget.contiId}',
        data: {
          'title': _titleCtrl.text.trim(),
          'description': _descCtrl.text.trim(),
          'worshipDate': dateStr,
        },
      );
      if (mounted) Navigator.pop(context);
      await widget.onSaved();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('수정에 실패했습니다.')));
      }
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
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: cs.outline.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Text(
            '콘티 정보 수정',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _titleCtrl,
            decoration: InputDecoration(
              labelText: '제목 *',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 12,
              ),
            ),
          ),
          const SizedBox(height: 12),
          InkWell(
            onTap: _pickDate,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                border: Border.all(color: cs.outline.withValues(alpha: 0.5)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.calendar_today_outlined,
                    size: 18,
                    color: cs.onSurface.withValues(alpha: 0.5),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    _selectedDate != null
                        ? '${_selectedDate!.year}년 ${_selectedDate!.month}월 ${_selectedDate!.day}일'
                        : '예배 날짜 선택',
                    style: TextStyle(
                      fontSize: 14,
                      color: _selectedDate != null
                          ? cs.onSurface
                          : cs.onSurface.withValues(alpha: 0.4),
                    ),
                  ),
                  if (_selectedDate != null) ...[
                    const Spacer(),
                    GestureDetector(
                      onTap: () => setState(() => _selectedDate = null),
                      child: Icon(
                        Icons.clear,
                        size: 16,
                        color: cs.onSurface.withValues(alpha: 0.4),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _descCtrl,
            maxLines: 2,
            decoration: InputDecoration(
              labelText: '메모',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 12,
              ),
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
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
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
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
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

// ─── 콘티 곡 설정 수정 시트 ────────────────────────────────────────────────────

class _EditContiSongSheet extends StatefulWidget {
  final String contiId;
  final ContiSongItem item;
  final Future<void> Function() onSaved;

  const _EditContiSongSheet({
    required this.contiId,
    required this.item,
    required this.onSaved,
  });

  @override
  State<_EditContiSongSheet> createState() => _EditContiSongSheetState();
}

class _EditContiSongSheetState extends State<_EditContiSongSheet> {
  late final TextEditingController _tempoCtrl;
  late final TextEditingController _noteCtrl;
  String _selectedKey = '';
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _selectedKey = widget.item.key ?? '';
    _tempoCtrl = TextEditingController(
      text: widget.item.tempo?.toString() ?? '',
    );
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
      await dio.patch(
        'contis/${widget.contiId}/songs/${widget.item.id}',
        data: {
          'key': _selectedKey.isNotEmpty ? _selectedKey : null,
          'tempo': _tempoCtrl.text.isNotEmpty
              ? int.tryParse(_tempoCtrl.text)
              : null,
          'note': _noteCtrl.text.trim().isNotEmpty
              ? _noteCtrl.text.trim()
              : null,
        },
      );
      if (mounted) Navigator.pop(context);
      await widget.onSaved();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('수정에 실패했습니다.')));
      }
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
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: cs.outline.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Text(
            '"${widget.item.song.title}" 설정 수정',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _selectedKey.isEmpty ? '' : _selectedKey,
                  decoration: InputDecoration(
                    labelText: '키',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                  ),
                  items: [
                    DropdownMenuItem(
                      value: '',
                      child: Text(
                        '기본 (${widget.item.song.defaultKey ?? '없음'})',
                      ),
                    ),
                    ..._keys.map(
                      (k) => DropdownMenuItem(value: k, child: Text(k)),
                    ),
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
                    hintText: widget.item.song.tempo != null
                        ? '기본: ${widget.item.song.tempo}'
                        : '예) 120',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
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
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 8,
              ),
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
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
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
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
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

// ─── 찬양 추가 시트 ───────────────────────────────────────────────────────────

class _AddSongSheet extends StatefulWidget {
  final String contiId;
  final Set<String> addedSongIds;
  final Future<void> Function() onAdded;

  const _AddSongSheet({
    required this.contiId,
    required this.addedSongIds,
    required this.onAdded,
  });

  @override
  State<_AddSongSheet> createState() => _AddSongSheetState();
}

class _AddSongSheetState extends State<_AddSongSheet> {
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

  Future<void> _add() async {
    final sel = _selected;
    if (sel == null) return;
    setState(() => _adding = true);
    try {
      await dio.post(
        'contis/${widget.contiId}/songs',
        data: {
          'songId': sel['id'],
          if (_selectedKey.isNotEmpty) 'key': _selectedKey,
          if (_note.trim().isNotEmpty) 'note': _note.trim(),
        },
      );
      if (mounted) Navigator.pop(context);
      await widget.onAdded();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('추가에 실패했습니다.')));
      }
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    final filtered = _songs.where((s) {
      final q = _search.toLowerCase();
      final title = (s['title'] as String).toLowerCase();
      final artist = ((s['artist'] as String?) ?? '').toLowerCase();
      return q.isEmpty || title.contains(q) || artist.contains(q);
    }).toList();

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      padding: EdgeInsets.fromLTRB(0, 0, 0, bottom),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(24),
      ),
      height: MediaQuery.of(context).size.height * 0.82,
      child: Column(
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              decoration: BoxDecoration(
                color: cs.outline.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                const Text(
                  '찬양 추가',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
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
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
              onChanged: (v) => setState(() {
                _search = v;
                _selected = null;
              }),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: filtered.length,
                    itemBuilder: (context, i) {
                      final song = filtered[i];
                      final alreadyAdded = widget.addedSongIds.contains(
                        song['id'],
                      );
                      final isSelected = _selected?['id'] == song['id'];
                      return ListTile(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        tileColor: isSelected
                            ? const Color(0xFF7C3AED).withValues(alpha: 0.08)
                            : null,
                        title: Text(
                          song['title'] as String,
                          style: TextStyle(
                            fontSize: 14,
                            color: alreadyAdded
                                ? cs.onSurface.withValues(alpha: 0.3)
                                : null,
                          ),
                        ),
                        subtitle: song['artist'] != null
                            ? Text(
                                song['artist'] as String,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: alreadyAdded
                                      ? cs.onSurface.withValues(alpha: 0.2)
                                      : cs.onSurface.withValues(alpha: 0.5),
                                ),
                              )
                            : null,
                        trailing: alreadyAdded
                            ? Text(
                                '추가됨',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: cs.onSurface.withValues(alpha: 0.3),
                                ),
                              )
                            : isSelected
                            ? Icon(
                                Icons.check_circle,
                                color: cs.primary,
                                size: 20,
                              )
                            : null,
                        onTap: alreadyAdded
                            ? null
                            : () => setState(() {
                                _selected = song;
                                _selectedKey =
                                    song['defaultKey'] as String? ?? '';
                              }),
                      );
                    },
                  ),
          ),
          if (_selected != null)
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(color: cs.outline.withValues(alpha: 0.2)),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '"${_selected!['title']}" 설정',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: cs.primary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _selectedKey.isEmpty
                              ? ''
                              : _selectedKey,
                          decoration: InputDecoration(
                            labelText: '키',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                          ),
                          items: [
                            DropdownMenuItem(
                              value: '',
                              child: Text(
                                '기본 (${_selected!['defaultKey'] ?? '없음'})',
                              ),
                            ),
                            ..._keys.map(
                              (k) => DropdownMenuItem(value: k, child: Text(k)),
                            ),
                          ],
                          onChanged: (v) =>
                              setState(() => _selectedKey = v ?? ''),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          decoration: InputDecoration(
                            labelText: '송폼',
                            hintText: '예) 간주 후 반복',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
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
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _adding
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(
                        _selected != null
                            ? '"${_selected!['title']}" 추가하기'
                            : '곡을 선택하세요',
                        style: const TextStyle(fontSize: 14),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
