import 'package:dio/dio.dart';
import 'constants.dart';
import 'token_storage.dart';

String get _apiBaseUrl => kApiUrl.endsWith('/') ? kApiUrl : '$kApiUrl/';

Dio _createDio() {
  final dio = Dio(BaseOptions(baseUrl: _apiBaseUrl));

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await TokenStorage.getAccessToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          final refreshToken = await TokenStorage.getRefreshToken();
          if (refreshToken != null) {
            try {
              final refreshDio = Dio(BaseOptions(baseUrl: _apiBaseUrl));
              final res = await refreshDio.post(
                'auth/refresh',
                options: Options(
                  headers: {'Authorization': 'Bearer $refreshToken'},
                ),
              );
              final newAccess = res.data['accessToken'] as String;
              final newRefresh = res.data['refreshToken'] as String;
              final currentUser = await TokenStorage.getUser();
              if (currentUser != null) {
                await TokenStorage.save(
                  access: newAccess,
                  refresh: newRefresh,
                  user: currentUser,
                );
              }

              error.requestOptions.headers['Authorization'] =
                  'Bearer $newAccess';
              final retryResponse = await dio.fetch(error.requestOptions);
              handler.resolve(retryResponse);
              return;
            } catch (_) {
              await TokenStorage.clear();
            }
          }
        }
        handler.next(error);
      },
    ),
  );

  return dio;
}

final dio = _createDio();
