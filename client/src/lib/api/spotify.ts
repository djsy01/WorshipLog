import { request, authHeaders } from './request';

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  tempo: number | null;
  previewUrl: string | null;
}

export const spotifyApi = {
  search: (token: string, q: string) =>
    request<SpotifyTrack[]>(`/spotify/search?q=${encodeURIComponent(q)}`, { headers: authHeaders(token) }),
};
