import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api_client.dart';
import '../models/song.dart';

// 초성 분류
const _choToCategory = {
  0: 'ㄱ',
  1: 'ㄱ',
  2: 'ㄴ',
  3: 'ㄷ',
  4: 'ㄷ',
  5: 'ㄹ',
  6: 'ㅁ',
  7: 'ㅂ',
  8: 'ㅂ',
  9: 'ㅅ',
  10: 'ㅅ',
  11: 'ㅇ',
  12: 'ㅈ',
  13: 'ㅈ',
  14: 'ㅊ',
  15: 'ㅊ',
  16: 'ㅊ',
  17: 'ㅊ',
  18: 'ㅎ',
};

String? getSongCategory(String title) {
  if (title.isEmpty) return null;
  final code = title.codeUnitAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) {
    return _choToCategory[(code - 0xAC00) ~/ (21 * 28)];
  }
  final first = title[0].toUpperCase();
  if (first.compareTo('A') >= 0 && first.compareTo('Z') <= 0) return first;
  return null;
}

class SongsState {
  final List<Song> songs;
  final bool isLoading;
  final String? error;
  final String search;
  final String? selectedCategory;

  const SongsState({
    this.songs = const [],
    this.isLoading = false,
    this.error,
    this.search = '',
    this.selectedCategory,
  });

  SongsState copyWith({
    List<Song>? songs,
    bool? isLoading,
    String? error,
    String? search,
    Object? selectedCategory = _sentinel,
  }) => SongsState(
    songs: songs ?? this.songs,
    isLoading: isLoading ?? this.isLoading,
    error: error,
    search: search ?? this.search,
    selectedCategory: selectedCategory == _sentinel
        ? this.selectedCategory
        : selectedCategory as String?,
  );

  List<Song> get filtered {
    if (selectedCategory == null) return songs;
    return songs
        .where((s) => getSongCategory(s.title) == selectedCategory)
        .toList();
  }
}

const _sentinel = Object();

class SongsNotifier extends StateNotifier<SongsState> {
  SongsNotifier() : super(const SongsState(isLoading: true)) {
    fetch();
  }

  Future<void> fetch([String? query]) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await dio.get(
        'songs',
        queryParameters: query != null && query.isNotEmpty
            ? {'search': query}
            : null,
      );
      final songs = (res.data as List)
          .map((e) => Song.fromJson(e as Map<String, dynamic>))
          .toList();
      state = state.copyWith(songs: songs, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setSearch(String q) {
    state = state.copyWith(search: q);
  }

  Future<void> setSearchAndFetch(String q) async {
    state = state.copyWith(search: q);
    await fetch(q.isNotEmpty ? q : null);
  }

  Future<void> deleteSong(String id) async {
    await dio.delete('songs/$id');
    state = state.copyWith(
      songs: state.songs.where((s) => s.id != id).toList(),
    );
  }

  Future<Song> updateSong(String id, Map<String, dynamic> data) async {
    final res = await dio.patch('songs/$id', data: data);
    final updated = Song.fromJson(res.data as Map<String, dynamic>);
    state = state.copyWith(
      songs: state.songs.map((s) => s.id == id ? updated : s).toList(),
    );
    return updated;
  }

  Future<Song> uploadSheet(
    String id, {
    required String fileName,
    String? filePath,
    List<int>? bytes,
  }) async {
    final MultipartFile file;
    if (bytes != null) {
      file = MultipartFile.fromBytes(bytes, filename: fileName);
    } else if (filePath != null) {
      file = await MultipartFile.fromFile(filePath, filename: fileName);
    } else {
      throw StateError('업로드할 악보 파일을 찾을 수 없습니다.');
    }

    final res = await dio.post(
      'songs/$id/sheet',
      data: FormData.fromMap({'file': file}),
    );
    final updated = Song.fromJson(res.data as Map<String, dynamic>);
    state = state.copyWith(
      songs: state.songs.map((s) => s.id == id ? updated : s).toList(),
    );
    return updated;
  }

  Future<Song> deleteSheet(String id) async {
    final res = await dio.delete('songs/$id/sheet');
    final updated = Song.fromJson(res.data as Map<String, dynamic>);
    state = state.copyWith(
      songs: state.songs.map((s) => s.id == id ? updated : s).toList(),
    );
    return updated;
  }

  void setCategory(String? cat) {
    state = SongsState(
      songs: state.songs,
      search: state.search,
      selectedCategory: cat,
    );
  }
}

final songsProvider = StateNotifierProvider<SongsNotifier, SongsState>(
  (ref) => SongsNotifier(),
);
