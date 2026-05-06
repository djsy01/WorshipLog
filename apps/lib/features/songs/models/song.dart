class Song {
  final String id;
  final String title;
  final String? artist;
  final String? defaultKey;
  final int? tempo;
  final String? lyrics;
  final String? scriptureRef;
  final String? sheetMusicUrl;
  final bool isPublic;
  final String? createdBy;

  const Song({
    required this.id,
    required this.title,
    this.artist,
    this.defaultKey,
    this.tempo,
    this.lyrics,
    this.scriptureRef,
    this.sheetMusicUrl,
    this.isPublic = true,
    this.createdBy,
  });

  factory Song.fromJson(Map<String, dynamic> json) => Song(
        id: json['id'] as String,
        title: json['title'] as String,
        artist: json['artist'] as String?,
        defaultKey: json['defaultKey'] as String?,
        tempo: (json['tempo'] as num?)?.toInt(),
        lyrics: json['lyrics'] as String?,
        scriptureRef: json['scriptureRef'] as String?,
        sheetMusicUrl: json['sheetMusicUrl'] as String?,
        isPublic: json['isPublic'] as bool? ?? true,
        createdBy: json['createdBy'] as String?,
      );
}
