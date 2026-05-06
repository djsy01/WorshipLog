import 'package:flutter/material.dart';
import '../models/conti_detail.dart';
import 'conti_inline_pdf.dart';

class ContiSheetViewer extends StatefulWidget {
  final List<ContiSheet> sheets;
  final String? defaultSheetUrl;
  final Future<void> Function(String sheetId) onDelete;
  final ColorScheme cs;

  const ContiSheetViewer({
    super.key,
    required this.sheets,
    this.defaultSheetUrl,
    required this.onDelete,
    required this.cs,
  });

  @override
  State<ContiSheetViewer> createState() => _ContiSheetViewerState();
}

class _ContiSheetViewerState extends State<ContiSheetViewer> {
  int _currentIndex = 0;
  late final PageController _pageController;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final items = widget.sheets.isNotEmpty
        ? widget.sheets.map((s) => (id: s.id, url: s.url, deletable: true)).toList()
        : widget.defaultSheetUrl != null
            ? [(id: '', url: widget.defaultSheetUrl!, deletable: false)]
            : <({String id, String url, bool deletable})>[];

    if (items.isEmpty) return const SizedBox.shrink();

    final idx = _currentIndex.clamp(0, items.length - 1);
    final currentItem = items[idx];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Divider(height: 1, color: widget.cs.outline.withValues(alpha: 0.2)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          child: Row(
            children: [
              Text(
                currentItem.deletable ? '임시악보' : '기본악보',
                style: TextStyle(fontSize: 12, color: widget.cs.onSurface.withValues(alpha: 0.4)),
              ),
              if (items.length > 1) ...[
                const SizedBox(width: 6),
                Text('${idx + 1} / ${items.length}',
                    style: TextStyle(fontSize: 12, color: widget.cs.onSurface.withValues(alpha: 0.5))),
              ],
              const Spacer(),
              if (currentItem.deletable)
                TextButton(
                  onPressed: () {
                    final id = currentItem.id;
                    if (_currentIndex > 0 && _currentIndex >= items.length - 1) {
                      _pageController.previousPage(
                          duration: const Duration(milliseconds: 250), curve: Curves.easeInOut);
                    }
                    widget.onDelete(id);
                  },
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.red,
                    visualDensity: VisualDensity.compact,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                  child: const Text('삭제', style: TextStyle(fontSize: 12)),
                ),
            ],
          ),
        ),
        Stack(
          alignment: Alignment.center,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 0, 8, 12),
              child: items.length == 1
                  ? _buildSheetItem(items[0])
                  : SizedBox(
                      height: MediaQuery.of(context).size.width * 1.3,
                      child: PageView.builder(
                        controller: _pageController,
                        itemCount: items.length,
                        onPageChanged: (i) => setState(() => _currentIndex = i),
                        itemBuilder: (_, i) => Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: _buildSheetItem(items[i]),
                        ),
                      ),
                    ),
            ),
            if (items.length > 1) ...[
              Positioned(
                left: 0,
                child: ContiNavArrow(
                  icon: Icons.chevron_left,
                  enabled: idx > 0,
                  onTap: () => _pageController.previousPage(
                      duration: const Duration(milliseconds: 250), curve: Curves.easeInOut),
                ),
              ),
              Positioned(
                right: 0,
                child: ContiNavArrow(
                  icon: Icons.chevron_right,
                  enabled: idx < items.length - 1,
                  onTap: () => _pageController.nextPage(
                      duration: const Duration(milliseconds: 250), curve: Curves.easeInOut),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }

  Widget _buildSheetItem(({String id, String url, bool deletable}) item) {
    final isPdf = item.url.toLowerCase().contains('.pdf');
    if (isPdf) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: ContiInlinePdfPreview(
          url: item.url,
          title: item.deletable ? '임시악보' : '기본악보',
          cs: widget.cs,
        ),
      );
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Image.network(
        item.url,
        fit: BoxFit.contain,
        loadingBuilder: (context, child, progress) {
          if (progress == null) return child;
          return const SizedBox(height: 200, child: Center(child: CircularProgressIndicator()));
        },
        errorBuilder: (context, error, stack) => Container(
          height: 60,
          alignment: Alignment.center,
          child: Text('이미지를 불러올 수 없습니다.',
              style: TextStyle(fontSize: 12, color: widget.cs.onSurface.withValues(alpha: 0.4))),
        ),
      ),
    );
  }
}

class ContiNavArrow extends StatelessWidget {
  final IconData icon;
  final bool enabled;
  final VoidCallback onTap;

  const ContiNavArrow({super.key, required this.icon, required this.enabled, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 20),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: enabled ? 0.35 : 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: Colors.white.withValues(alpha: enabled ? 1.0 : 0.3), size: 22),
      ),
    );
  }
}
