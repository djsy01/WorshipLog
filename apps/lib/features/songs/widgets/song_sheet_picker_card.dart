import 'package:flutter/material.dart';

class SongSheetPickerCard extends StatelessWidget {
  final String? currentUrl;
  final String? selectedFileName;
  final bool removeCurrent;
  final VoidCallback onOpenCurrent;
  final VoidCallback onPick;
  final VoidCallback onClearPicked;
  final VoidCallback? onToggleRemove;

  const SongSheetPickerCard({
    super.key,
    required this.currentUrl,
    required this.selectedFileName,
    required this.removeCurrent,
    required this.onOpenCurrent,
    required this.onPick,
    required this.onClearPicked,
    required this.onToggleRemove,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final hasCurrent = currentUrl != null && currentUrl!.isNotEmpty;
    final hasPicked = selectedFileName != null;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cs.outline.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('악보 (PDF / 이미지)',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: cs.onSurface.withValues(alpha: 0.65))),
          if (hasCurrent && !hasPicked) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: cs.surfaceContainerHighest.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextButton.icon(
                      onPressed: removeCurrent ? null : onOpenCurrent,
                      icon: const Icon(Icons.open_in_new_rounded, size: 16),
                      label: Text(removeCurrent ? '삭제 예정' : '현재 악보 보기'),
                      style: TextButton.styleFrom(alignment: Alignment.centerLeft, padding: EdgeInsets.zero),
                    ),
                  ),
                  TextButton(onPressed: onToggleRemove, child: Text(removeCurrent ? '삭제 취소' : '삭제')),
                ],
              ),
            ),
          ],
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: removeCurrent ? null : onPick,
            icon: const Icon(Icons.upload_file_rounded, size: 18),
            label: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                hasPicked ? selectedFileName! : hasCurrent ? '악보 교체' : '악보 업로드',
                overflow: TextOverflow.ellipsis,
              ),
            ),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(44),
              alignment: Alignment.centerLeft,
              side: BorderSide(color: cs.outline.withValues(alpha: 0.45)),
            ),
          ),
          if (hasPicked) ...[
            const SizedBox(height: 4),
            TextButton(onPressed: onClearPicked, child: const Text('선택 취소')),
          ],
        ],
      ),
    );
  }
}
