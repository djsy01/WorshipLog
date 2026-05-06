import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/songs_provider.dart';
import '../models/song.dart';
import '../widgets/song_widgets.dart';
import '../widgets/song_detail_sheet.dart';

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
      builder: (_) => SongDetailSheet(song: song),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(songsProvider);
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_searchCtrl.text != state.search) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _searchCtrl.text != state.search) {
          _searchCtrl.text = state.search;
          _searchCtrl.selection = TextSelection.collapsed(offset: state.search.length);
        }
      });
    }

    return Column(
      children: [
        AppBar(
          leading: Padding(
            padding: const EdgeInsets.all(10),
            child: Image.asset('assets/images/logo.png', fit: BoxFit.contain),
          ),
          title: const Text('찬양 검색', style: TextStyle(fontWeight: FontWeight.bold)),
          centerTitle: true,
          automaticallyImplyLeading: false,
        ),
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
                      icon: Icon(Icons.close, size: 18, color: Colors.grey[500]),
                      onPressed: () { _searchCtrl.clear(); _onSearchChanged(''); },
                    )
                  : null,
            ),
          ),
        ),
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            children: [
              SongCategoryChip(label: '전체', selected: state.selectedCategory == null, onTap: () => ref.read(songsProvider.notifier).setCategory(null)),
              const SizedBox(width: 6),
              const SongCategoryDivider(),
              const SizedBox(width: 6),
              ...kKoChars.map((c) => Padding(
                padding: const EdgeInsets.only(right: 6),
                child: SongCategoryChip(
                  label: c,
                  selected: state.selectedCategory == c,
                  onTap: () => ref.read(songsProvider.notifier).setCategory(state.selectedCategory == c ? null : c),
                ),
              )),
              const SongCategoryDivider(),
              const SizedBox(width: 6),
              ...kEnChars.map((c) => Padding(
                padding: const EdgeInsets.only(right: 6),
                child: SongCategoryChip(
                  label: c,
                  selected: state.selectedCategory == c,
                  onTap: () => ref.read(songsProvider.notifier).setCategory(state.selectedCategory == c ? null : c),
                ),
              )),
            ],
          ),
        ),
        Divider(height: 1, color: cs.outline.withValues(alpha: 0.3)),
        Expanded(
          child: state.isLoading
              ? const Center(child: CircularProgressIndicator())
              : state.error != null
              ? SongsErrorState(message: state.error!, onRetry: () => ref.read(songsProvider.notifier).fetch())
              : state.filtered.isEmpty
              ? SongsEmptyState(search: state.search, category: state.selectedCategory)
              : RefreshIndicator(
                  onRefresh: () => ref.read(songsProvider.notifier).fetch(state.search.isNotEmpty ? state.search : null),
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    itemCount: state.filtered.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, i) => SongListCard(
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
