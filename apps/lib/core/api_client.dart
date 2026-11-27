import 'package:dio/dio.dart';
import 'api_session.dart';
import 'constants.dart';
import 'token_storage.dart';

String get _apiBaseUrl => kApiUrl.endsWith('/') ? kApiUrl : '$kApiUrl/';
const _retried = 'authRetried';
void Function()? onAuthFailed;

Dio _createDio() {
  final dio = Dio(BaseOptions(baseUrl: _apiBaseUrl));
  final session = ApiSession(_apiBaseUrl, () => onAuthFailed?.call());

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        if (options.path != 'auth/login' &&
            options.path != 'auth/register' &&
            options.extra[_retried] != true) {
          final token = await TokenStorage.getAccessToken();
          if (token != null) options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        final options = error.requestOptions;
        final authorization = options.headers['Authorization'];
        if (error.response?.statusCode != 401 ||
            authorization is! String ||
            options.extra[_retried] == true) {
          handler.next(error);
          return;
        }
        try {
          final access = await session.refresh(authorization);
          if (access != null) {
            final body = options.data;
            final retry = options.copyWith(
              headers: {...options.headers, 'Authorization': 'Bearer $access'},
              extra: {...options.extra, _retried: true},
              data: body is FormData ? body.clone() : body,
            );
            handler.resolve(await dio.fetch(retry));
            return;
          }
        } on DioException catch (retryError) {
          handler.next(retryError);
          return;
        } catch (_) {
          /* Preserve the original request error if storage fails. */
        }
        handler.next(error);
      },
    ),
  );

  return dio;
}

final dio = _createDio();
