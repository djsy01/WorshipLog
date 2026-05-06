import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/home_provider.dart';
import '../widgets/home_widgets.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  AuthStatus? _lastStatus;

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final home = ref.watch(homeProvider);
    final cs = Theme.of(context).colorScheme;
    final isAuth = auth.status == AuthStatus.authenticated;

    if (auth.status != AuthStatus.unknown && auth.status != _lastStatus) {
      _lastStatus = auth.status;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(homeProvider.notifier).load(isAuthenticated: isAuth);
      });
    }

    final actions = [
      if (isAuth)
        IconButton(
          icon: const Icon(Icons.logout_rounded),
          onPressed: () => ref.read(authProvider.notifier).logout(),
        )
      else
        TextButton.icon(
          onPressed: () => context.push('/login'),
          icon: const Icon(Icons.login_rounded, size: 18),
          label: const Text('로그인'),
        ),
    ];

    return Column(
      children: [
        AppBar(
          leading: Padding(
            padding: const EdgeInsets.all(10),
            child: Image.asset('assets/images/logo.png', fit: BoxFit.contain),
          ),
          title: const Text('WorshipLog', style: TextStyle(fontWeight: FontWeight.bold)),
          centerTitle: true,
          actions: actions,
          automaticallyImplyLeading: false,
        ),
        Expanded(
          child: home.isLoading
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: () => ref.read(homeProvider.notifier).load(isAuthenticated: isAuth),
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                    children: [
                      Text(
                        auth.user != null ? '안녕하세요, ${auth.user!.name}님 👋' : '안녕하세요!',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '오늘도 찬양으로 하나님께 영광을 돌리세요.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: cs.onSurface.withValues(alpha: 0.5),
                            ),
                      ),
                      const SizedBox(height: 20),
                      HomeVerseCard(verse: home.verse),
                      const SizedBox(height: 16),
                      const HomeQuickActions(),
                      const SizedBox(height: 16),
                      if (home.recentContis.isNotEmpty)
                        HomeRecentContis(contis: home.recentContis),
                    ],
                  ),
                ),
        ),
      ],
    );
  }
}
