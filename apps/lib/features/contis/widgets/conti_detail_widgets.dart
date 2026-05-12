import 'package:flutter/material.dart';
import '../models/conti_detail.dart';

class ContiInfoCard extends StatelessWidget {
  final ContiDetail conti;
  final VoidCallback onEdit;
  final ColorScheme cs;

  const ContiInfoCard(
      {super.key, required this.conti, required this.onEdit, required this.cs});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cs.outline.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(conti.title,
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.bold)),
                if (conti.worshipDate != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    '${conti.worshipDate!.year}년 ${conti.worshipDate!.month}월 ${conti.worshipDate!.day}일',
                    style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF7C3AED),
                        fontWeight: FontWeight.w500),
                  ),
                ],
                if (conti.description != null &&
                    conti.description!.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(conti.description!,
                      style: TextStyle(
                          fontSize: 13,
                          color: cs.onSurface.withValues(alpha: 0.5))),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: onEdit,
            child: Container(
              color: Colors.transparent,
              padding: const EdgeInsets.all(8),
              child: Icon(Icons.edit_outlined,
                  size: 20, color: cs.onSurface.withValues(alpha: 0.5)),
            ),
          ),
        ],
      ),
    );
  }
}

class ContiDetailEmptyState extends StatelessWidget {
  final VoidCallback onAdd;
  final ColorScheme cs;

  const ContiDetailEmptyState(
      {super.key, required this.onAdd, required this.cs});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 32),
      decoration: BoxDecoration(
        border: Border.all(color: cs.outline.withValues(alpha: 0.3)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Column(
          children: [
            Text('아직 찬양이 없습니다.',
                style: TextStyle(color: cs.onSurface.withValues(alpha: 0.4))),
            const SizedBox(height: 8),
            TextButton(onPressed: onAdd, child: const Text('찬양 추가하기')),
          ],
        ),
      ),
    );
  }
}
