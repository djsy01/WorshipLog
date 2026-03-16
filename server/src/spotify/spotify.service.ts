import { Injectable } from '@nestjs/common';

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  tempo: number | null;
  previewUrl: string | null;
}

@Injectable()
export class SpotifyService {
  async search(query: string): Promise<SpotifyTrack[]> {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&country=KR&limit=10`;
    const res = await fetch(url, { redirect: 'follow' });

    if (!res.ok) throw new Error('곡 검색 실패');

    const data = (await res.json()) as {
      results: Array<{ trackId: number; trackName: string; artistName: string; previewUrl?: string }>;
    };

    return data.results.map((t) => ({
      id: String(t.trackId),
      title: t.trackName,
      artist: t.artistName,
      tempo: null,
      previewUrl: t.previewUrl ?? null,
    }));
  }
}
