import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/auth/screens/register_screen.dart';

// violet-600 (#7C3AED) — client와 동일한 primary 색상
const _violet = Color(0xFF7C3AED);

ThemeData _buildTheme(Brightness brightness) {
  final isDark = brightness == Brightness.dark;
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: ColorScheme(
      brightness: brightness,
      primary: _violet,
      onPrimary: Colors.white,
      primaryContainer: isDark ? const Color(0xFF4C1D95) : const Color(0xFFEDE9FE),
      onPrimaryContainer: isDark ? const Color(0xFFEDE9FE) : const Color(0xFF4C1D95),
      secondary: _violet,
      onSecondary: Colors.white,
      secondaryContainer: isDark ? const Color(0xFF4C1D95) : const Color(0xFFEDE9FE),
      onSecondaryContainer: isDark ? const Color(0xFFEDE9FE) : const Color(0xFF4C1D95),
      error: isDark ? const Color(0xFFF87171) : const Color(0xFFDC2626),
      onError: Colors.white,
      errorContainer: isDark ? const Color(0xFF450A0A) : const Color(0xFFFEF2F2),
      onErrorContainer: isDark ? const Color(0xFFFCA5A5) : const Color(0xFF991B1B),
      surface: isDark ? const Color(0xFF111827) : const Color(0xFFF9FAFB),
      onSurface: isDark ? Colors.white : const Color(0xFF111827),
      surfaceContainerHighest: isDark ? const Color(0xFF1F2937) : Colors.white,
      outline: isDark ? const Color(0xFF4B5563) : const Color(0xFFD1D5DB),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: isDark ? const Color(0xFF1F2937) : Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(
          color: isDark ? const Color(0xFF4B5563) : const Color(0xFFD1D5DB),
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(
          color: isDark ? const Color(0xFF4B5563) : const Color(0xFFD1D5DB),
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: _violet, width: 2),
      ),
      labelStyle: TextStyle(
        color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF374151),
        fontSize: 14,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: _violet,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: _violet),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: isDark ? const Color(0xFF111827) : Colors.white,
      foregroundColor: isDark ? Colors.white : const Color(0xFF111827),
      elevation: 0,
      shadowColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
    ),
    scaffoldBackgroundColor: isDark ? const Color(0xFF111827) : const Color(0xFFF9FAFB),
  );
}

void main() {
  runApp(const ProviderScope(child: WorshipLogApp()));
}

class WorshipLogApp extends ConsumerWidget {
  const WorshipLogApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    final router = GoRouter(
      initialLocation: '/login',
      redirect: (context, state) {
        final isAuth = authState.status == AuthStatus.authenticated;
        final isUnknown = authState.status == AuthStatus.unknown;
        final isAuthRoute =
            state.matchedLocation == '/login' ||
            state.matchedLocation == '/register';

        if (isUnknown) return null;
        if (!isAuth && !isAuthRoute) return '/login';
        if (isAuth && isAuthRoute) return '/home';
        return null;
      },
      routes: [
        GoRoute(path: '/login', builder: (ctx, s) => const LoginScreen()),
        GoRoute(path: '/register', builder: (ctx, s) => const RegisterScreen()),
        GoRoute(path: '/home', builder: (ctx, s) => const HomeScreen()),
      ],
    );

    return MaterialApp.router(
      title: 'WorshipLog',
      theme: _buildTheme(Brightness.light),
      darkTheme: _buildTheme(Brightness.dark),
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'WorshipLog',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authProvider.notifier).logout(),
          ),
        ],
      ),
      body: const Center(child: Text('홈 화면 (준비 중)')),
    );
  }
}
