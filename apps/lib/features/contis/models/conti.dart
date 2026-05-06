class Conti {
  final String id;
  final String title;
  final String? description;
  final DateTime? worshipDate;
  final int songCount;
  final DateTime createdAt;

  Conti({
    required this.id,
    required this.title,
    this.description,
    this.worshipDate,
    required this.songCount,
    required this.createdAt,
  });

  factory Conti.fromJson(Map<String, dynamic> json) {
    final songs = json['songs'] as List? ?? [];
    return Conti(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      worshipDate: json['worshipDate'] != null
          ? DateTime.tryParse(json['worshipDate'] as String)
          : null,
      songCount: songs.length,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
