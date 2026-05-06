import 'dart:async';
import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/songs_provider.dart';
import '../models/song.dart';

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

const _koChars = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅎ'];
const _enChars = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
];

Future<bool> _launchSheetUrl(String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null) return false;

  for (final mode in [
    LaunchMode.platformDefault,
    LaunchMode.externalApplication,
    LaunchMode.inAppBrowserView,
  ]) {
    try {
      if (await launchUrl(uri, mode: mode)) return true;
    } catch (_) {
      // Try the next launch mode.
    }
  }
  return false;
}

class SongsScreen extends ConsumerStatefulWidget {
  final String? initialQuery;

  const SongsScreen({super.key, this.initialQuery});

  @override
  ConsumerState<SongsScreen> createState() => _SongsScreenState();
}

class _SongsScreenState extends ConsumerState<SongsScreen> {
  final _searchCtrl = TextEditingController();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    if (widget.initialQuery != null) {
      _searchCtrl.text = widget.initialQuery!;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(songsProvider.notifier).fetch(widget.initialQuery);
      });
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearchChanged(String q) {
    ref.read(songsProvider.notifier).setSearch(q);
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      ref.read(songsProvider.notifier).fetch(q.isNotEmpty ? q : null);
    });
  }

  void _showDetail(BuildContext context, Song song) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _SongDetailSheet(song: song),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(songsProvider);

    // 외부(홈 화면 등)에서 search가 바뀌면 TextField에 반영
    if (_searchCtrl.text != state.search) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _searchCtrl.text != state.search) {
          _searchCtrl.text = state.search;
          _searchCtrl.selection = TextSelection.collapsed(
            offset: state.search.length,
          );
        }
      });
    }
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      children: [
        AppBar(
          leading: Padding(
            padding: const EdgeInsets.all(10),
            child: Image.asset('assets/images/logo.png', fit: BoxFit.contain),
          ),
          title: const Text(
            '찬양 검색',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          centerTitle: true,
          automaticallyImplyLeading: false,
        ),

        // 검색창
        Container(
          color: isDark ? const Color(0xFF111827) : Colors.white,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: TextField(
            controller: _searchCtrl,
            onChanged: _onSearchChanged,
            decoration: InputDecoration(
              hintText: '곡명, 아티스트, 말씀 구절로 검색...',
              prefixIcon: Icon(Icons.search, size: 20, color: Colors.grey[500]),
              suffixIcon: state.search.isNotEmpty
                  ? IconButton(
                      icon: Icon(
                        Icons.close,
                        size: 18,
                        color: Colors.grey[500],
                      ),
                      onPressed: () {
                        _searchCtrl.clear();
                        _onSearchChanged('');
                      },
                    )
                  : null,
            ),
          ),
        ),

        // 카테고리 칩
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            children: [
              _CategoryChip(
                label: '전체',
                selected: state.selectedCategory == null,
                onTap: () => ref.read(songsProvider.notifier).setCategory(null),
              ),
              const SizedBox(width: 6),
              const _CategoryDivider(),
              const SizedBox(width: 6),
              ..._koChars.map(
                (c) => Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: _CategoryChip(
                    label: c,
                    selected: state.selectedCategory == c,
                    onTap: () => ref
                        .read(songsProvider.notifier)
                        .setCategory(state.selectedCategory == c ? null : c),
                  ),
                ),
              ),
              const _CategoryDivider(),
              const SizedBox(width: 6),
              ..._enChars.map(
                (c) => Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: _CategoryChip(
                    label: c,
                    selected: state.selectedCategory == c,
                    onTap: () => ref
                        .read(songsProvider.notifier)
                        .setCategory(state.selectedCategory == c ? null : c),
                  ),
                ),
              ),
            ],
          ),
        ),

        Divider(height: 1, color: cs.outline.withValues(alpha: 0.3)),

        // 리스트
        Expanded(
          child: state.isLoading
              ? const Center(child: CircularProgressIndicator())
              : state.error != null
              ? _ErrorState(
                  message: state.error!,
                  onRetry: () => ref.read(songsProvider.notifier).fetch(),
                )
              : state.filtered.isEmpty
              ? _EmptyState(
                  search: state.search,
                  category: state.selectedCategory,
                )
              : RefreshIndicator(
                  onRefresh: () => ref
                      .read(songsProvider.notifier)
                      .fetch(state.search.isNotEmpty ? state.search : null),
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    itemCount: state.filtered.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, i) => _SongCard(
                      song: state.filtered[i],
                      onTap: () => _showDetail(context, state.filtered[i]),
                    ),
                  ),
                ),
        ),
      ],
    );
  }
}

class _CategoryChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _CategoryChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: selected
              ? const Color(0xFF7C3AED)
              : (isDark ? const Color(0xFF1F2937) : const Color(0xFFF3F4F6)),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected
                ? const Color(0xFF7C3AED)
                : (isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB)),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected
                ? Colors.white
                : (isDark ? const Color(0xFF9CA3AF) : const Color(0xFF4B5563)),
          ),
        ),
      ),
    );
  }
}

class _CategoryDivider extends StatelessWidget {
  const _CategoryDivider();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: 1,
      margin: const EdgeInsets.symmetric(vertical: 4),
      color: isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB),
    );
  }
}

class _SongCard extends StatelessWidget {
  final Song song;
  final VoidCallback onTap;

  const _SongCard({required this.song, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: cs.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: cs.outline.withValues(alpha: 0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              song.title,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (song.artist != null) ...[
              const SizedBox(height: 2),
              Text(
                song.artist!,
                style: TextStyle(
                  fontSize: 13,
                  color: isDark
                      ? const Color(0xFF9CA3AF)
                      : const Color(0xFF6B7280),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            if (song.defaultKey != null ||
                song.tempo != null ||
                song.scriptureRef != null) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  if (song.defaultKey != null)
                    _Badge(
                      text: song.defaultKey!,
                      bgColor: isDark
                          ? const Color(0xFF4C1D95).withValues(alpha: 0.4)
                          : const Color(0xFFEDE9FE),
                      textColor: isDark
                          ? const Color(0xFFA78BFA)
                          : const Color(0xFF5B21B6),
                    ),
                  if (song.tempo != null)
                    _Badge(
                      text: '♩ ${song.tempo} BPM',
                      bgColor: isDark
                          ? const Color(0xFF78350F).withValues(alpha: 0.4)
                          : const Color(0xFFFEF3C7),
                      textColor: isDark
                          ? const Color(0xFFFBBF24)
                          : const Color(0xFF92400E),
                    ),
                  if (song.scriptureRef != null)
                    _Badge(
                      text: '📖 ${song.scriptureRef!}',
                      bgColor: isDark
                          ? const Color(0xFF1F2937)
                          : const Color(0xFFF3F4F6),
                      textColor: isDark
                          ? const Color(0xFF9CA3AF)
                          : const Color(0xFF4B5563),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  final String text;
  final Color bgColor;
  final Color textColor;

  const _Badge({
    required this.text,
    required this.bgColor,
    required this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }
}

class _SongDetailSheet extends ConsumerStatefulWidget {
  final Song song;
  const _SongDetailSheet({required this.song});

  @override
  ConsumerState<_SongDetailSheet> createState() => _SongDetailSheetState();
}

class _SongDetailSheetState extends ConsumerState<_SongDetailSheet> {
  late Song _song;
  bool _deleting = false;

  @override
  void initState() {
    super.initState();
    _song = widget.song;
  }

  bool _canEdit(AuthState auth) {
    if (auth.status != AuthStatus.authenticated || auth.user == null) {
      return false;
    }
    // 관리자는 모든 곡 수정 가능
    if (auth.user!.role == 'admin') {
      return true;
    }
    // 본인이 업로드한 곡만 수정 가능
    if (_song.createdBy != null && _song.createdBy == auth.user!.id) {
      return true;
    }
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
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('취소'),
          ),
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
      builder: (_) => _SongEditSheet(song: _song),
    );
    if (updated != null && mounted) {
      setState(() => _song = updated);
    }
  }

  Future<void> _openSheetMusic(BuildContext context) async {
    final url = _song.sheetMusicUrl;
    if (url == null || url.isEmpty) return;
    final messenger = ScaffoldMessenger.of(context);
    final uri = Uri.tryParse(url);
    if (uri == null) {
      messenger.showSnackBar(
        const SnackBar(content: Text('악보 주소가 올바르지 않습니다.')),
      );
      return;
    }
    final opened = await _launchSheetUrl(url);
    if (!opened) {
      messenger.showSnackBar(const SnackBar(content: Text('악보를 열 수 없습니다.')));
    }
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
            // 드래그 핸들
            Container(
              margin: const EdgeInsets.only(top: 12, bottom: 4),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: cs.outline.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            // 헤더
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 16, 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _song.title,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (_song.artist != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            _song.artist!,
                            style: TextStyle(
                              fontSize: 14,
                              color: isDark
                                  ? const Color(0xFF9CA3AF)
                                  : const Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: Icon(Icons.close, color: Colors.grey[500]),
                  ),
                ],
              ),
            ),

            // 배지
            if (_song.defaultKey != null ||
                _song.tempo != null ||
                _song.scriptureRef != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    if (_song.defaultKey != null)
                      _Badge(
                        text: _song.defaultKey!,
                        bgColor: isDark
                            ? const Color(0xFF4C1D95).withValues(alpha: 0.4)
                            : const Color(0xFFEDE9FE),
                        textColor: isDark
                            ? const Color(0xFFA78BFA)
                            : const Color(0xFF5B21B6),
                      ),
                    if (_song.tempo != null)
                      _Badge(
                        text: '♩ ${_song.tempo} BPM',
                        bgColor: isDark
                            ? const Color(0xFF78350F).withValues(alpha: 0.4)
                            : const Color(0xFFFEF3C7),
                        textColor: isDark
                            ? const Color(0xFFFBBF24)
                            : const Color(0xFF92400E),
                      ),
                    if (_song.scriptureRef != null)
                      _Badge(
                        text: '📖 ${_song.scriptureRef!}',
                        bgColor: isDark
                            ? const Color(0xFF1F2937)
                            : const Color(0xFFF3F4F6),
                        textColor: isDark
                            ? const Color(0xFF9CA3AF)
                            : const Color(0xFF4B5563),
                      ),
                  ],
                ),
              ),

            Divider(
              height: 24,
              indent: 20,
              endIndent: 20,
              color: cs.outline.withValues(alpha: 0.3),
            ),

            // 가사
            Expanded(
              child: _song.lyrics != null
                  ? ListView(
                      controller: controller,
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
                      children: [
                        Text(
                          '가사',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.2,
                            color: Colors.grey[500],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _song.lyrics!,
                          style: const TextStyle(fontSize: 14, height: 1.8),
                        ),
                      ],
                    )
                  : Center(
                      child: Text(
                        '등록된 가사가 없습니다.',
                        style: TextStyle(color: Colors.grey[500], fontSize: 14),
                      ),
                    ),
            ),

            // 하단 버튼 영역
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
                            icon: const Icon(
                              Icons.picture_as_pdf_outlined,
                              size: 18,
                            ),
                            label: const Text('악보 보기'),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              side: BorderSide(
                                color: cs.outline.withValues(alpha: 0.5),
                              ),
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
                                padding: const EdgeInsets.symmetric(
                                  vertical: 12,
                                ),
                                side: BorderSide(
                                  color: cs.outline.withValues(alpha: 0.5),
                                ),
                              ),
                              child: const Text('수정'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton(
                              onPressed: _deleting
                                  ? null
                                  : () => _delete(context),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 12,
                                ),
                                foregroundColor: Colors.red,
                                side: BorderSide(
                                  color: Colors.red.withValues(alpha: 0.4),
                                ),
                              ),
                              child: _deleting
                                  ? const SizedBox(
                                      height: 16,
                                      width: 16,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    )
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

class _SongEditSheet extends ConsumerStatefulWidget {
  final Song song;
  const _SongEditSheet({required this.song});

  @override
  ConsumerState<_SongEditSheet> createState() => _SongEditSheetState();
}

class _SongEditSheetState extends ConsumerState<_SongEditSheet> {
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
    _tempoCtrl = TextEditingController(
      text: widget.song.tempo?.toString() ?? '',
    );
    _scriptureCtrl = TextEditingController(
      text: widget.song.scriptureRef ?? '',
    );
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

      if (_artistCtrl.text.trim().isNotEmpty) {
        data['artist'] = _artistCtrl.text.trim();
      }

      if (_selectedKey != null && _selectedKey!.isNotEmpty) {
        data['defaultKey'] = _selectedKey;
      }

      if (_tempoCtrl.text.isNotEmpty) {
        final tempo = int.tryParse(_tempoCtrl.text);
        if (tempo != null) data['tempo'] = tempo;
      }

      if (_scriptureCtrl.text.isNotEmpty) {
        data['scriptureRef'] = _scriptureCtrl.text.trim();
      }

      if (_lyricsCtrl.text.isNotEmpty) {
        data['lyrics'] = _lyricsCtrl.text.trim();
      }

      Song updated = await ref
          .read(songsProvider.notifier)
          .updateSong(widget.song.id, data);

      if (_removeSheet && updated.sheetMusicUrl != null) {
        updated = await ref
            .read(songsProvider.notifier)
            .deleteSheet(updated.id);
      }

      if (_sheetFile != null) {
        updated = await ref
            .read(songsProvider.notifier)
            .uploadSheet(
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
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('수정 실패: $e')));
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
    final uri = Uri.tryParse(url);
    if (uri == null) {
      messenger.showSnackBar(
        const SnackBar(content: Text('악보 주소가 올바르지 않습니다.')),
      );
      return;
    }
    final opened = await _launchSheetUrl(url);
    if (!opened) {
      messenger.showSnackBar(const SnackBar(content: Text('악보를 열 수 없습니다.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final canSave = _titleCtrl.text.trim().isNotEmpty;

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.92,
        ),
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
                        width: 36,
                        height: 4,
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: cs.outline.withValues(alpha: 0.4),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const Text(
                      '찬양 수정',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),

                    TextField(
                      controller: _titleCtrl,
                      onChanged: (_) => setState(() {}),
                      decoration: const InputDecoration(labelText: '곡명 *'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _artistCtrl,
                      onChanged: (_) => setState(() {}),
                      decoration: const InputDecoration(
                        labelText: '아티스트 / 찬양팀',
                      ),
                    ),
                    const SizedBox(height: 12),

                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _selectedKey,
                            decoration: const InputDecoration(labelText: '키'),
                            items: [
                              const DropdownMenuItem(
                                value: null,
                                child: Text('선택 안함'),
                              ),
                              ..._keys.map(
                                (k) =>
                                    DropdownMenuItem(value: k, child: Text(k)),
                              ),
                            ],
                            onChanged: (v) => setState(() => _selectedKey = v),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: _tempoCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'BPM'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    TextField(
                      controller: _scriptureCtrl,
                      decoration: const InputDecoration(
                        labelText: '말씀 구절 (예: 시 23:1)',
                      ),
                    ),
                    const SizedBox(height: 12),

                    TextField(
                      controller: _lyricsCtrl,
                      maxLines: 5,
                      decoration: const InputDecoration(
                        labelText: '가사',
                        alignLabelWithHint: true,
                      ),
                    ),
                    const SizedBox(height: 16),

                    _SheetPickerCard(
                      currentUrl: widget.song.sheetMusicUrl,
                      selectedFileName: _sheetFile?.name,
                      removeCurrent: _removeSheet,
                      onOpenCurrent: () => _openCurrentSheet(context),
                      onPick: _pickSheet,
                      onClearPicked: () => setState(() {
                        _sheetFile = null;
                        _sheetBytes = null;
                      }),
                      onToggleRemove: widget.song.sheetMusicUrl == null
                          ? null
                          : () => setState(() {
                              _removeSheet = !_removeSheet;
                              if (_removeSheet) {
                                _sheetFile = null;
                                _sheetBytes = null;
                              }
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
                  border: Border(
                    top: BorderSide(color: cs.outline.withValues(alpha: 0.2)),
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _saving
                            ? null
                            : () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: const Text('취소'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton(
                        onPressed: (canSave && !_saving) ? _save : null,
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: _saving
                            ? const SizedBox(
                                height: 18,
                                width: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
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

class _SheetPickerCard extends StatelessWidget {
  final String? currentUrl;
  final String? selectedFileName;
  final bool removeCurrent;
  final VoidCallback onOpenCurrent;
  final VoidCallback onPick;
  final VoidCallback onClearPicked;
  final VoidCallback? onToggleRemove;

  const _SheetPickerCard({
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
          Text(
            '악보 (PDF / 이미지)',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: cs.onSurface.withValues(alpha: 0.65),
            ),
          ),
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
                      style: TextButton.styleFrom(
                        alignment: Alignment.centerLeft,
                        padding: EdgeInsets.zero,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: onToggleRemove,
                    child: Text(removeCurrent ? '삭제 취소' : '삭제'),
                  ),
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
                hasPicked
                    ? selectedFileName!
                    : hasCurrent
                    ? '악보 교체'
                    : '악보 업로드',
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

class _EmptyState extends StatelessWidget {
  final String search;
  final String? category;

  const _EmptyState({required this.search, this.category});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.music_off_outlined, size: 48, color: Colors.grey[400]),
            const SizedBox(height: 12),
            Text(
              search.isNotEmpty
                  ? '"$search"에 해당하는 찬양이 없습니다.'
                  : category != null
                  ? "'$category'으로 시작하는 찬양이 없습니다."
                  : '찬양이 없습니다.',
              style: TextStyle(color: Colors.grey[500], fontSize: 14),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.grey[400]),
            const SizedBox(height: 12),
            Text(
              '불러오기 실패',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('다시 시도')),
          ],
        ),
      ),
    );
  }
}
