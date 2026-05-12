import 'package:flutter/foundation.dart';

class UnreadService {
  static final _counts = ValueNotifier<Map<String, int>>({});

  static ValueNotifier<Map<String, int>> get counts => _counts;

  static void increment(String roomId) {
    final m = Map<String, int>.from(_counts.value);
    m[roomId] = (m[roomId] ?? 0) + 1;
    _counts.value = Map.unmodifiable(m);
  }

  static void clear(String roomId) {
    if (!_counts.value.containsKey(roomId)) return;
    final m = Map<String, int>.from(_counts.value);
    m.remove(roomId);
    _counts.value = Map.unmodifiable(m);
  }

  static int countFor(String roomId) => _counts.value[roomId] ?? 0;
}
