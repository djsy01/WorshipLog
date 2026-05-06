import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../contis/screens/contis_screen.dart';
import '../../home/screens/home_screen.dart';
import '../../songs/screens/songs_screen.dart';

final shellTabProvider = StateProvider<int>((ref) => 0);

// 탭별 Navigator 키 — 탭 내부에서 상세 페이지를 push 해도 footer nav가 유지됨
final homeNavKey = GlobalKey<NavigatorState>();
final contisNavKey = GlobalKey<NavigatorState>();

class ShellScreen extends ConsumerWidget {
  const ShellScreen({super.key});

  static const _labels = ['홈', '찬양검색', '콘티', '팀스페이스', '설정'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final index = ref.watch(shellTabProvider);

    return PopScope(
      // 탭 내부 Navigator에 이전 페이지가 있으면 뒤로 가기, 없으면 앱 종료
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        final navKey = index == 0
            ? homeNavKey
            : index == 2
            ? contisNavKey
            : null;
        if (navKey?.currentState?.canPop() == true) {
          navKey!.currentState!.pop();
        }
      },
      child: Scaffold(
        appBar: index == 0 || index == 1 || index == 2
            ? null
            : AppBar(
                leading: Padding(
                  padding: const EdgeInsets.all(10),
                  child: Image.asset('assets/images/logo.png', fit: BoxFit.contain),
                ),
                title: Text(
                  _labels[index],
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                centerTitle: true,
              ),
        body: IndexedStack(
          index: index,
          children: [
            // 홈 탭 — 내부 Navigator로 콘티 상세 push 가능
            Navigator(
              key: homeNavKey,
              onGenerateRoute: (_) => MaterialPageRoute(
                builder: (_) => const HomeScreen(),
              ),
            ),
            const SongsScreen(),
            // 콘티 탭 — 내부 Navigator로 콘티 상세 push 가능
            Navigator(
              key: contisNavKey,
              onGenerateRoute: (_) => MaterialPageRoute(
                builder: (_) => const ContisScreen(),
              ),
            ),
            ...['팀스페이스', '설정'].map(
              (label) => Center(
                child: Text(
                  '$label 준비 중',
                  style: TextStyle(color: Colors.grey[500], fontSize: 16),
                ),
              ),
            ),
          ],
        ),
        bottomNavigationBar: SafeArea(
          top: false,
          child: NavigationBar(
            selectedIndex: index,
            onDestinationSelected: (i) =>
                ref.read(shellTabProvider.notifier).state = i,
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home),
                label: '홈',
              ),
              NavigationDestination(
                icon: Icon(Icons.music_note_outlined),
                selectedIcon: Icon(Icons.music_note),
                label: '찬양',
              ),
              NavigationDestination(
                icon: Icon(Icons.list_alt_outlined),
                selectedIcon: Icon(Icons.list_alt),
                label: '콘티',
              ),
              NavigationDestination(
                icon: Icon(Icons.group_outlined),
                selectedIcon: Icon(Icons.group),
                label: '팀',
              ),
              NavigationDestination(
                icon: Icon(Icons.settings_outlined),
                selectedIcon: Icon(Icons.settings),
                label: '설정',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
