import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/song.dart';

const kSongKeys = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
  'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm',
];

const kKoChars = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅎ'];
const kEnChars = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
];

Future<bool> launchSheetUrl(String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null) return false;
  for (final mode in [
    LaunchMode.platformDefault,
    LaunchMode.externalApplication,
    LaunchMode.inAppBrowserView,
  ]) {
    try {
      if (await launchUrl(uri, mode: mode)) return true;
    } catch (_) {}
  }
  return false;
}

class SongCategoryChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const SongCategoryChip({super.key, required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: selected
              ? const Color(0xFF7C3AED)
              : (isDark ? const Color(0xFF1F2937) : const Color(0xFFF3F4F6)),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected
                ? const Color(0xFF7C3AED)
                : (isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB)),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected
                ? Colors.white
                : (isDark ? const Color(0xFF9CA3AF) : const Color(0xFF4B5563)),
          ),
        ),
      ),
    );
  }
}

class SongCategoryDivider extends StatelessWidget {
  const SongCategoryDivider({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: 1,
      margin: const EdgeInsets.symmetric(vertical: 4),
      color: isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB),
    );
  }
}

class SongListCard extends StatelessWidget {
  final Song song;
  final VoidCallback onTap;

  const SongListCard({super.key, required this.song, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: cs.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: cs.outline.withValues(alpha: 0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(song.title,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
            if (song.artist != null) ...[
              const SizedBox(height: 2),
              Text(song.artist!,
                  style: TextStyle(fontSize: 13, color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280)),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
            ],
            if (song.defaultKey != null || song.tempo != null || song.scriptureRef != null) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  if (song.defaultKey != null)
                    SongBadge(
                      text: song.defaultKey!,
                      bgColor: isDark ? const Color(0xFF4C1D95).withValues(alpha: 0.4) : const Color(0xFFEDE9FE),
                      textColor: isDark ? const Color(0xFFA78BFA) : const Color(0xFF5B21B6),
                    ),
                  if (song.tempo != null)
                    SongBadge(
                      text: '♩ ${song.tempo} BPM',
                      bgColor: isDark ? const Color(0xFF78350F).withValues(alpha: 0.4) : const Color(0xFFFEF3C7),
                      textColor: isDark ? const Color(0xFFFBBF24) : const Color(0xFF92400E),
                    ),
                  if (song.scriptureRef != null)
                    SongBadge(
                      text: '📖 ${song.scriptureRef!}',
                      bgColor: isDark ? const Color(0xFF1F2937) : const Color(0xFFF3F4F6),
                      textColor: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF4B5563),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class SongBadge extends StatelessWidget {
  final String text;
  final Color bgColor;
  final Color textColor;

  const SongBadge({super.key, required this.text, required this.bgColor, required this.textColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(6)),
      child: Text(text, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: textColor)),
    );
  }
}

class SongsEmptyState extends StatelessWidget {
  final String search;
  final String? category;

  const SongsEmptyState({super.key, required this.search, this.category});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.music_off_outlined, size: 48, color: Colors.grey[400]),
            const SizedBox(height: 12),
            Text(
              search.isNotEmpty
                  ? '"$search"에 해당하는 찬양이 없습니다.'
                  : category != null
                      ? "'$category'으로 시작하는 찬양이 없습니다."
                      : '찬양이 없습니다.',
              style: TextStyle(color: Colors.grey[500], fontSize: 14),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class SongsErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const SongsErrorState({super.key, required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.grey[400]),
            const SizedBox(height: 12),
            Text('불러오기 실패', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey[600])),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('다시 시도')),
          ],
        ),
      ),
    );
  }
}
