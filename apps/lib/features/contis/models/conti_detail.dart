class ContiSheet {
  final String id;
  final String url;
  ContiSheet({required this.id, required this.url});
  factory ContiSheet.fromJson(Map<String, dynamic> json) => ContiSheet(
        id: json['id'] as String,
        url: json['url'] as String,
      );
}

class SongInfo {
  final String id;
  final String title;
  final String? artist;
  final String? defaultKey;
  final int? tempo;
  final String? sheetMusicUrl;

  SongInfo({
    required this.id,
    required this.title,
    this.artist,
    this.defaultKey,
    this.tempo,
    this.sheetMusicUrl,
  });

  factory SongInfo.fromJson(Map<String, dynamic> json) => SongInfo(
        id: json['id'] as String,
        title: json['title'] as String,
        artist: json['artist'] as String?,
        defaultKey: json['defaultKey'] as String?,
        tempo: json['tempo'] as int?,
        sheetMusicUrl: json['sheetMusicUrl'] as String?,
      );
}

class ContiSongItem {
  final String id;
  final String songId;
  final String? key;
  final int? tempo;
  final String? note;
  final SongInfo song;
  final List<ContiSheet> sheets;

  ContiSongItem({
    required this.id,
    required this.songId,
    this.key,
    this.tempo,
    this.note,
    required this.song,
    this.sheets = const [],
  });

  factory ContiSongItem.fromJson(Map<String, dynamic> json) => ContiSongItem(
        id: json['id'] as String,
        songId: json['songId'] as String,
        key: json['key'] as String?,
        tempo: json['tempo'] as int?,
        note: json['note'] as String?,
        song: SongInfo.fromJson(json['song'] as Map<String, dynamic>),
        sheets: (json['sheets'] as List? ?? [])
            .map((e) => ContiSheet.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class ContiDetail {
  final String id;
  final String title;
  final String? description;
  final DateTime? worshipDate;
  final List<ContiSongItem> songs;

  ContiDetail({
    required this.id,
    required this.title,
    this.description,
    this.worshipDate,
    required this.songs,
  });

  factory ContiDetail.fromJson(Map<String, dynamic> json) => ContiDetail(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String?,
        worshipDate: json['worshipDate'] != null
            ? DateTime.tryParse(json['worshipDate'] as String)
            : null,
        songs: (json['songs'] as List? ?? [])
            .map((e) => ContiSongItem.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
