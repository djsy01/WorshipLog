import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/conti.dart';
import '../providers/contis_provider.dart';
import '../screens/conti_detail_screen.dart';
import '../../shell/screens/shell_screen.dart';

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
          : RefreshIndicator(
              onRefresh: () => ref.read(contisProvider.notifier).load(),
              child: state.contis.isEmpty
                  ? _EmptyState(
                      onCreateTap: () => _showCreateDialog(context, ref),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: state.contis.length,
                      separatorBuilder: (context, i) => const SizedBox(height: 10),
                      itemBuilder: (context, i) => _ContiCard(
                        conti: state.contis[i],
                        onDelete: () =>
                            _confirmDelete(context, ref, state.contis[i]),
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
      builder: (_) => _CreateContiSheet(ref: ref),
    );
  }

  Future<void> _confirmDelete(
    BuildContext context,
    WidgetRef ref,
    Conti conti,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('콘티 삭제'),
        content: Text('"${conti.title}"을 삭제할까요?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('취소'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('삭제'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      ref.read(contisProvider.notifier).delete(conti.id);
    }
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
        MaterialPageRoute(
          builder: (_) => ContiDetailScreen(contiId: conti.id),
        ),
      ),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: cs.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: cs.outline.withValues(alpha: 0.3)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
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
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
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
                  if (conti.description != null &&
                      conti.description!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      conti.description!,
                      style: TextStyle(
                        fontSize: 13,
                        color: cs.onSurface.withValues(alpha: 0.5),
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  const SizedBox(height: 8),
                  Text(
                    '찬양 ${conti.songCount}곡',
                    style: TextStyle(
                      fontSize: 12,
                      color: cs.onSurface.withValues(alpha: 0.4),
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: Icon(
                Icons.delete_outline,
                size: 20,
                color: cs.onSurface.withValues(alpha: 0.3),
              ),
              onPressed: onDelete,
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
          Text(
            '아직 콘티가 없습니다.',
            style: TextStyle(
              color: Colors.grey[500],
              fontSize: 15,
            ),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: onCreateTap,
            child: const Text(
              '첫 번째 콘티 만들기',
              style: TextStyle(
                color: Color(0xFF7C3AED),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CreateContiSheet extends ConsumerStatefulWidget {
  final WidgetRef ref;
  const _CreateContiSheet({required this.ref});

  @override
  ConsumerState<_CreateContiSheet> createState() => _CreateContiSheetState();
}

class _CreateContiSheetState extends ConsumerState<_CreateContiSheet> {
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  DateTime? _selectedDate;
  bool _saving = false;

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) setState(() => _selectedDate = picked);
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) return;

    setState(() => _saving = true);
    final dateStr = _selectedDate != null
        ? '${_selectedDate!.year}-${_selectedDate!.month.toString().padLeft(2, '0')}-${_selectedDate!.day.toString().padLeft(2, '0')}'
        : null;

    final conti = await widget.ref.read(contisProvider.notifier).create(
          title: title,
          description: _descController.text.trim(),
          worshipDate: dateStr,
        );

    if (mounted) {
      Navigator.pop(context);
      if (conti == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('콘티 생성에 실패했습니다.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final bottom = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + bottom),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 핸들
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: cs.outline.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Text(
            '새 콘티 만들기',
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),

          // 제목
          TextField(
            controller: _titleController,
            autofocus: true,
            decoration: InputDecoration(
              labelText: '제목 *',
              hintText: '예) 3월 둘째 주 주일 예배',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 12,
              ),
            ),
          ),
          const SizedBox(height: 12),

          // 날짜
          InkWell(
            onTap: _pickDate,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                border: Border.all(color: cs.outline.withValues(alpha: 0.5)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(Icons.calendar_today_outlined,
                      size: 18, color: cs.onSurface.withValues(alpha: 0.5)),
                  const SizedBox(width: 10),
                  Text(
                    _selectedDate != null
                        ? '${_selectedDate!.year}년 ${_selectedDate!.month}월 ${_selectedDate!.day}일'
                        : '예배 날짜 선택',
                    style: TextStyle(
                      fontSize: 14,
                      color: _selectedDate != null
                          ? cs.onSurface
                          : cs.onSurface.withValues(alpha: 0.4),
                    ),
                  ),
                  if (_selectedDate != null) ...[
                    const Spacer(),
                    GestureDetector(
                      onTap: () => setState(() => _selectedDate = null),
                      child: Icon(Icons.clear,
                          size: 16,
                          color: cs.onSurface.withValues(alpha: 0.4)),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // 메모
          TextField(
            controller: _descController,
            maxLines: 2,
            decoration: InputDecoration(
              labelText: '메모',
              hintText: '예배에 대한 간단한 메모',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 12,
              ),
            ),
          ),
          const SizedBox(height: 20),

          // 버튼
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('취소'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: _saving ||
                          _titleController.text.trim().isEmpty
                      ? null
                      : _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF7C3AED),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('만들기'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
