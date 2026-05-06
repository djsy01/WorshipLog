import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api_client.dart';
import '../models/bible_verse.dart';
import '../models/conti_summary.dart';

class HomeState {
  final BibleVerse? verse;
  final List<ContiSummary> recentContis;
  final bool isLoading;

  HomeState({
    this.verse,
    this.recentContis = const [],
    this.isLoading = false,
  });

  HomeState copyWith({
    BibleVerse? verse,
    List<ContiSummary>? recentContis,
    bool? isLoading,
  }) => HomeState(
    verse: verse ?? this.verse,
    recentContis: recentContis ?? this.recentContis,
    isLoading: isLoading ?? this.isLoading,
  );
}

class HomeNotifier extends StateNotifier<HomeState> {
  HomeNotifier() : super(HomeState(isLoading: true)) {
    load();
  }

  Future<void> load({bool isAuthenticated = false}) async {
    state = state.copyWith(isLoading: true);
    try {
      final verseRes = await (isAuthenticated
          ? dio.get('bible/today').catchError((_) => dio.get('bible/random'))
          : dio.get('bible/random'));

      final verse = BibleVerse.fromJson(verseRes.data as Map<String, dynamic>);

      List<ContiSummary> contis = [];
      if (isAuthenticated) {
        final contisRes = await dio.get('contis');
        contis = (contisRes.data as List)
            .map((e) => ContiSummary.fromJson(e as Map<String, dynamic>))
            .take(3)
            .toList();
      }

      state = HomeState(verse: verse, recentContis: contis);
    } catch (_) {
      state = HomeState();
    }
  }
}

final homeProvider = StateNotifierProvider<HomeNotifier, HomeState>(
  (ref) => HomeNotifier(),
);
