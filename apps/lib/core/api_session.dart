import 'dart:convert';
import 'package:dio/dio.dart';
import 'token_storage.dart';

class ApiSession {
  ApiSession(String baseUrl, this._onFailure)
    : _refreshDio = Dio(BaseOptions(baseUrl: baseUrl));
  final Dio _refreshDio;
  final void Function() _onFailure;
  Future<String?>? _pendingRefresh;

  Future<String?> refresh(String rejectedAuthorization) async {
    final pending = _pendingRefresh ??= _rotate(rejectedAuthorization);
    try {
      final access = await pending;
      if (access == null) return null;
      return _subject(access) == _subject(rejectedAuthorization)
          ? access
          : null;
    } finally {
      if (identical(_pendingRefresh, pending)) _pendingRefresh = null;
    }
  }
  String? _subject(String token) {
    try {
      final payload = base64Url.normalize(token.split('.')[1]);
      final claims = jsonDecode(utf8.decode(base64Url.decode(payload)));
      return claims['sub'] as String?;
    } catch (_) {
      return null;
    }
  }

  Future<String?> _rotate(String rejectedAuthorization) async {
    final access = await TokenStorage.getAccessToken();
    if (access == null) return null;
    if ('Bearer $access' != rejectedAuthorization) return access;

    final refresh = await TokenStorage.getRefreshToken();
    try {
      if (refresh == null) throw StateError('세션이 만료되었습니다.');
      final response = await _refreshDio.post<Map<String, dynamic>>(
        'auth/refresh',
        options: Options(headers: {'Authorization': 'Bearer $refresh'}),
      );
      final data = response.data!;
      final newAccess = data['accessToken'] as String;
      final newRefresh = data['refreshToken'] as String;
      final replaced = await TokenStorage.replaceTokens(
        refresh,
        newAccess,
        newRefresh,
      );
      return replaced ? newAccess : null;
    } catch (_) {
      if (await TokenStorage.clearExpiredSession(refresh)) _onFailure();
      return null;
    }
  }
}
