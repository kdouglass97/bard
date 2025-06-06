// src/lib/spotify.ts
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const SPOTIFY_API = "https://api.spotify.com/v1";

/** 
 * Read the JWT from the incoming request, extract the Spotify accessToken 
 * (which our NextAuth jwt callback put into `token.accessToken`).
 */
export async function getSpotifyToken(req: NextRequest): Promise<string> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.accessToken) {
    throw new Error("No Spotify access token in NextAuth JWT");
  }
  return token.accessToken as string;
}

/**
 * Fetch every playlist the user owns or follows,
 * following Spotify’s pagination until `next` is null.
 */
export async function fetchAllPlaylists(
  req: NextRequest
): Promise<SpotifyApi.PlaylistObjectSimplified[]> {
  const accessToken = await getSpotifyToken(req);

  const playlists: SpotifyApi.PlaylistObjectSimplified[] = [];
  let url = `${SPOTIFY_API}/me/playlists?limit=50`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(
        `Spotify playlist fetch failed: ${res.status} ${res.statusText}`
      );
    }
    const data = (await res.json()) as SpotifyApi.ListOfCurrentUsersPlaylistsResponse;
    playlists.push(...data.items);
    url = data.next ?? "";
  }

  return playlists;
}
