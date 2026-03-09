import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  tempo: number | null;
  previewUrl: string | null;
}

@Injectable()
export class SpotifyService {
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private config: ConfigService) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const clientId = this.config.get<string>('SPOTIFY_CLIENT_ID');
    const clientSecret = this.config.get<string>('SPOTIFY_CLIENT_SECRET');

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) throw new Error('Spotify 인증 실패');

    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  async search(query: string): Promise<SpotifyTrack[]> {
    const token = await this.getAccessToken();

    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&market=KR&limit=10`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('Spotify 검색 실패');

    const data = (await res.json()) as {
      tracks: {
        items: Array<{
          id: string;
          name: string;
          artists: Array<{ name: string }>;
          preview_url: string | null;
        }>;
      };
    };

    const seen = new Set<string>();
    return data.tracks.items
      .filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      })
      .map((t) => ({
        id: t.id,
        title: t.name,
        artist: t.artists.map((a) => a.name).join(', '),
        tempo: null,
        previewUrl: t.preview_url,
      }));
  }
}
