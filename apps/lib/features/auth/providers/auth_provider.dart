import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api_client.dart' show dio, onAuthFailed;
import '../../../core/notification_service.dart';
import '../../../core/token_storage.dart';
import '../models/auth_response.dart';
import '../models/user_info.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final UserInfo? user;
  final String? error;

  AuthState({required this.status, this.user, this.error});
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(AuthState(status: AuthStatus.unknown)) {
    onAuthFailed = () => state = AuthState(status: AuthStatus.unauthenticated);
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final token = await TokenStorage.getAccessToken();
    final user = await TokenStorage.getUser();
    state = AuthState(
      status: token != null ? AuthStatus.authenticated : AuthStatus.unauthenticated,
      user: user,
    );
  }

  Future<void> login(String email, String password) async {
    try {
      final res = await dio.post(
        'auth/login',
        data: {'email': email, 'password': password},
      );
      final auth = AuthResponse.fromJson(res.data);
      await TokenStorage.save(
        access: auth.accessToken,
        refresh: auth.refreshToken,
        user: auth.user,
      );
      state = AuthState(status: AuthStatus.authenticated, user: auth.user);
      // FCM 토큰 서버 등록
      final fcmToken = await NotificationService.getToken();
      if (fcmToken != null) await NotificationService.saveTokenToServer(fcmToken);
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? '로그인에 실패했습니다.';
      state = AuthState(
        status: AuthStatus.unauthenticated,
        error: msg is List ? msg.first.toString() : msg.toString(),
      );
    }
  }

  Future<bool> register(String email, String password, String name) async {
    try {
      await dio.post(
        'auth/register',
        data: {'email': email, 'password': password, 'name': name},
      );
      return true;
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? '회원가입에 실패했습니다.';
      state = AuthState(
        status: AuthStatus.unauthenticated,
        error: msg is List ? msg.first.toString() : msg.toString(),
      );
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await dio.post('auth/logout');
    } catch (_) {}
    await TokenStorage.clear();
    state = AuthState(status: AuthStatus.unauthenticated);
  }

  void clearError() {
    state = AuthState(status: state.status, user: state.user);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(),
);
