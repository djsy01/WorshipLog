import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../features/auth/models/user_info.dart';

class TokenStorage {
  static const _storage = FlutterSecureStorage();
  static const _accessKey = 'accessToken';
  static const _refreshKey = 'refreshToken';
  static const _userKey = 'user';
  static Future<void> _pendingWrite = Future.value();
  static Future<String?> getAccessToken() => _storage.read(key: _accessKey);
  static Future<String?> getRefreshToken() => _storage.read(key: _refreshKey);
  static Future<UserInfo?> getUser() async {
    final raw = await _storage.read(key: _userKey);
    if (raw == null) return null;
    return UserInfo.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  static Future<void> save({
    required String access,
    required String refresh,
    required UserInfo user,
  }) => _serialize(() async {
    await _storage.write(key: _userKey, value: jsonEncode(user.toJson()));
    await _saveTokens(access, refresh);
  });

  static Future<bool> replaceTokens(
    String previous,
    String access,
    String refresh,
  ) => _ifRefreshMatches(previous, () => _saveTokens(access, refresh));
  static Future<bool> clearExpiredSession(String? previous) =>
      _ifRefreshMatches(previous, _clear);

  static Future<bool> _ifRefreshMatches(
    String? previous,
    Future<void> Function() write,
  ) => _serialize(() async {
    if (await getRefreshToken() != previous) return false;
    await write();
    return true;
  });
  static Future<void> clear() => _serialize(_clear);
  static Future<T> _serialize<T>(Future<T> Function() write) {
    final next = _pendingWrite.then((_) => write());
    _pendingWrite = next.then<void>((_) {}, onError: (Object _) {});
    return next;
  }
  static Future<void> _saveTokens(String access, String refresh) async {
    await _storage.write(key: _refreshKey, value: refresh);
    await _storage.write(key: _accessKey, value: access);
  }

  static Future<void> _clear() async {
    for (final key in [_accessKey, _refreshKey, _userKey]) {
      await _storage.delete(key: key);
    }
  }
}
