import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../features/auth/models/user_info.dart';

class TokenStorage {
  static const _storage = FlutterSecureStorage();
  static const _accessKey = 'accessToken';
  static const _refreshKey = 'refreshToken';
  static const _userKey = 'user';

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
  }) async {
    await _storage.write(key: _accessKey, value: access);
    await _storage.write(key: _refreshKey, value: refresh);
    await _storage.write(key: _userKey, value: jsonEncode(user.toJson()));
  }

  static Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _userKey);
  }
}
