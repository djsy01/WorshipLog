import 'package:dio/dio.dart';
import 'constants.dart';
import 'token_storage.dart';

Dio _createDio() {
  final dio = Dio(BaseOptions(baseUrl: kApiUrl));

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
              final refreshDio = Dio(BaseOptions(baseUrl: kApiUrl));
              final res = await refreshDio.post(
                '/auth/refresh',
                options: Options(
                  headers: {'Authorization': 'Bearer $refreshToken'},
                ),
              );
              final newAccess = res.data['accessToken'] as String;
              final newRefresh = res.data['refreshToken'] as String;
              await TokenStorage.save(access: newAccess, refresh: newRefresh);

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
