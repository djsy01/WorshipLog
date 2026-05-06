class ContiSummary {
  final String id;
  final String title;
  final DateTime? worshipDate;
  final int songCount;

  ContiSummary({
    required this.id,
    required this.title,
    this.worshipDate,
    required this.songCount,
  });

  factory ContiSummary.fromJson(Map<String, dynamic> json) {
    final songs = json['songs'] as List? ?? [];
    return ContiSummary(
      id: json['id'] as String,
      title: json['title'] as String,
      worshipDate: json['worshipDate'] != null
          ? DateTime.tryParse(json['worshipDate'] as String)
          : null,
      songCount: songs.length,
    );
  }
}
