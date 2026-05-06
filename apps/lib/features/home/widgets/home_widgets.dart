import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../contis/screens/conti_detail_screen.dart';
import '../../shell/screens/shell_screen.dart';
import '../models/conti_summary.dart';

class HomeVerseCard extends StatelessWidget {
  final dynamic verse;
  const HomeVerseCard({super.key, this.verse});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark
            ? const Color(0xFF4C1D95).withValues(alpha: 0.3)
            : const Color(0xFFEDE9FE),
        borderRadius: BorderRadius.circular(16),
      ),
      child: verse == null
          ? const _VerseSkeleton()
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '오늘의 말씀',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.5,
                    color: isDark ? const Color(0xFF8B5CF6) : const Color(0xFF5B21B6),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  verse.content,
                  style: TextStyle(
                    fontFamily: 'GabiaSolmee',
                    fontSize: 17,
                    color: isDark ? Colors.white : const Color(0xFF1F2937),
                    height: 1.7,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${verse.book} ${verse.chapter}:${verse.verse}',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isDark ? const Color(0xFFA78BFA) : const Color(0xFF7C3AED),
                  ),
                ),
              ],
            ),
    );
  }
}

class _VerseSkeleton extends StatelessWidget {
  const _VerseSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(height: 10, width: 60, decoration: _deco()),
        const SizedBox(height: 10),
        Container(height: 16, width: double.infinity, decoration: _deco()),
        const SizedBox(height: 6),
        Container(height: 16, width: 200, decoration: _deco()),
        const SizedBox(height: 10),
        Container(height: 12, width: 80, decoration: _deco()),
      ],
    );
  }

  BoxDecoration _deco() => BoxDecoration(
        color: const Color(0xFF7C3AED).withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      );
}

class HomeQuickActions extends ConsumerWidget {
  const HomeQuickActions({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Row(
      children: [
        Expanded(
          child: _QuickActionButton(
            icon: '✝️',
            label: '커뮤니티',
            desc: '크리스천과 신앙을 나눠보세요',
            onTap: () {},
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _QuickActionButton(
            icon: '📖',
            label: '말씀 묵상',
            desc: '오늘의 말씀 묵상 기록',
            onTap: () {},
          ),
        ),
      ],
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  final String icon;
  final String label;
  final String desc;
  final VoidCallback onTap;

  const _QuickActionButton({
    required this.icon,
    required this.label,
    required this.desc,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 14),
        decoration: BoxDecoration(
          color: cs.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: cs.outline.withValues(alpha: 0.3)),
        ),
        child: Column(
          children: [
            Text(icon, style: const TextStyle(fontSize: 28)),
            const SizedBox(height: 6),
            Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 2),
            Text(
              desc,
              style: TextStyle(fontSize: 10, color: Colors.grey[500]),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

class HomeRecentContis extends StatelessWidget {
  final List<ContiSummary> contis;
  const HomeRecentContis({super.key, required this.contis});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cs.outline.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('최근 콘티', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              TextButton(
                onPressed: () {},
                style: TextButton.styleFrom(
                  padding: EdgeInsets.zero,
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text('전체 보기', style: TextStyle(fontSize: 13)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...contis.map((c) => _ContiItem(conti: c)),
        ],
      ),
    );
  }
}

class _ContiItem extends StatelessWidget {
  final ContiSummary conti;
  const _ContiItem({required this.conti});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return InkWell(
      onTap: () => homeNavKey.currentState?.push(
        MaterialPageRoute(builder: (_) => ContiDetailScreen(contiId: conti.id)),
      ),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        margin: const EdgeInsets.only(bottom: 6),
        decoration: BoxDecoration(
          border: Border.all(color: cs.outline.withValues(alpha: 0.2)),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    conti.title,
                    style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (conti.worshipDate != null)
                    Text(
                      '${conti.worshipDate!.month}월 ${conti.worshipDate!.day}일',
                      style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text('${conti.songCount}곡', style: TextStyle(fontSize: 13, color: Colors.grey[500])),
          ],
        ),
      ),
    );
  }
}
