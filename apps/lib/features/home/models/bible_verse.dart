class BibleVerse {
  final String content;
  final String book;
  final int chapter;
  final int verse;

  BibleVerse({
    required this.content,
    required this.book,
    required this.chapter,
    required this.verse,
  });

  factory BibleVerse.fromJson(Map<String, dynamic> json) => BibleVerse(
    content: json['content'] as String,
    book: json['book'] as String,
    chapter: json['chapter'] as int,
    verse: json['verse'] as int,
  );
}
