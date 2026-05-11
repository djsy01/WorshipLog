import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api_client.dart';
import '../models/conti.dart';
import '../models/conti_detail.dart';

class ContisState {
  final List<Conti> contis;
  final bool isLoading;
  final String? error;

  const ContisState({
    this.contis = const [],
    this.isLoading = false,
    this.error,
  });

  ContisState copyWith({
    List<Conti>? contis,
    bool? isLoading,
    String? error,
  }) => ContisState(
    contis: contis ?? this.contis,
    isLoading: isLoading ?? this.isLoading,
    error: error,
  );
}

class ContisNotifier extends StateNotifier<ContisState> {
  ContisNotifier() : super(const ContisState(isLoading: true)) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await dio.get('contis');
      final contis = (res.data as List)
          .map((e) => Conti.fromJson(e as Map<String, dynamic>))
          .toList();
      state = ContisState(contis: contis);
    } catch (e) {
      state = ContisState(error: e.toString());
    }
  }

  Future<Conti?> create({
    required String title,
    String? description,
    String? worshipDate,
  }) async {
    try {
      final res = await dio.post('contis', data: {
        'title': title,
        if (description != null && description.isNotEmpty)
          'description': description,
        if (worshipDate != null && worshipDate.isNotEmpty)
          'worshipDate': worshipDate,
      });
      final conti = Conti.fromJson(res.data as Map<String, dynamic>);
      state = state.copyWith(contis: [conti, ...state.contis]);
      return conti;
    } catch (_) {
      return null;
    }
  }

  Future<bool> delete(String id) async {
    try {
      await dio.delete('contis/$id');
      state = state.copyWith(
        contis: state.contis.where((c) => c.id != id).toList(),
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<ContiDetail?> clone(String contiId) async {
    try {
      final res = await dio.post('contis/$contiId/clone');
      final cloned = ContiDetail.fromJson(res.data as Map<String, dynamic>);
      await load();
      return cloned;
    } catch (_) {
      return null;
    }
  }
}

final contisProvider = StateNotifierProvider<ContisNotifier, ContisState>(
  (ref) => ContisNotifier(),
);
