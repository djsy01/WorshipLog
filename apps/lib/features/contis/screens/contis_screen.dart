import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/conti.dart';
import '../providers/contis_provider.dart';
import '../screens/conti_detail_screen.dart';
import '../../shell/screens/shell_screen.dart';
import '../widgets/conti_create_sheet.dart';

class ContisScreen extends ConsumerWidget {
  const ContisScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(contisProvider);

    return Scaffold(
      appBar: AppBar(
        leading: Padding(
          padding: const EdgeInsets.all(10),
          child: Image.asset('assets/images/logo.png', fit: BoxFit.contain),
        ),
        title: const Text('콘티', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showCreateDialog(context, ref),
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null && state.contis.isEmpty
              ? _ErrorState(
                  message: state.error!,
                  onRetry: () => ref.read(contisProvider.notifier).load(),
                )
              : RefreshIndicator(
                  onRefresh: () => ref.read(contisProvider.notifier).load(),
                  child: state.contis.isEmpty
                      ? _EmptyState(onCreateTap: () => _showCreateDialog(context, ref))
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: state.contis.length,
                          separatorBuilder: (context, i) => const SizedBox(height: 10),
                          itemBuilder: (context, i) => _ContiCard(
                            conti: state.contis[i],
                            onDelete: () => _confirmDelete(context, ref, state.contis[i]),
                          ),
                        ),
                ),
    );
  }

  void _showCreateDialog(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ContiCreateSheet(ref: ref),
    );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref, Conti conti) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('콘티 삭제'),
        content: Text('"${conti.title}"을 삭제할까요?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('삭제'),
          ),
        ],
      ),
    );
    if (confirmed == true) ref.read(contisProvider.notifier).delete(conti.id);
  }
}

class _ContiCard extends StatelessWidget {
  final Conti conti;
  final VoidCallback onDelete;

  const _ContiCard({required this.conti, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return InkWell(
      onTap: () => contisNavKey.currentState?.push(
        MaterialPageRoute(builder: (_) => ContiDetailScreen(contiId: conti.id)),
      ),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: cs.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: cs.outline.withValues(alpha: 0.3)),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2)),
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    conti.title,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (conti.worshipDate != null) ...[
                    const SizedBox(height: 3),
                    Text(
                      '${conti.worshipDate!.year}년 ${conti.worshipDate!.month}월 ${conti.worshipDate!.day}일',
                      style: TextStyle(
                        fontSize: 12,
                        color: const Color(0xFF7C3AED).withValues(alpha: 0.8),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                  if (conti.description != null && conti.description!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      conti.description!,
                      style: TextStyle(fontSize: 13, color: cs.onSurface.withValues(alpha: 0.5)),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  const SizedBox(height: 8),
                  Text('찬양 ${conti.songCount}곡',
                      style: TextStyle(fontSize: 12, color: cs.onSurface.withValues(alpha: 0.4))),
                ],
              ),
            ),
            IconButton(
              icon: Icon(Icons.delete_outline, size: 20, color: cs.onSurface.withValues(alpha: 0.3)),
              onPressed: onDelete,
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.red[300]),
            const SizedBox(height: 12),
            Text('불러오기 실패', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.red[400])),
            const SizedBox(height: 8),
            Text(message, style: TextStyle(fontSize: 12, color: Colors.grey[500]), textAlign: TextAlign.center),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('다시 시도'),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onCreateTap;
  const _EmptyState({required this.onCreateTap});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text('📋', style: TextStyle(fontSize: 48)),
          const SizedBox(height: 12),
          Text('아직 콘티가 없습니다.', style: TextStyle(color: Colors.grey[500], fontSize: 15)),
          const SizedBox(height: 12),
          TextButton(
            onPressed: onCreateTap,
            child: const Text('첫 번째 콘티 만들기',
                style: TextStyle(color: Color(0xFF7C3AED), fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}
