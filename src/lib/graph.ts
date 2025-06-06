// src/lib/graph.ts
import { NextRequest } from "next/server";
import { fetchAllPlaylists, getSpotifyToken } from "@/lib/spotify";

const SPOTIFY_API = "https://api.spotify.com/v1";

export type Node = {
  id: string;
  data: {
    label: string;
    image?: string;      // URL for cover art
    isPlaylist: boolean; // distinguish node types
  };
  type: "playlist" | "song";
  style?: { width: number };
  position: { x: number; y: number };
};

export type Edge = {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
};

// Layout constants for a simple grid to avoid overlapping nodes
const PLAYLIST_SPACING_X = 220;
const SONG_SPACING_X = 220;
const SONG_SPACING_Y = 120;
const SONG_START_Y = 200;

// Deterministic positions for playlists and songs so they don't overlap
function playlistPosition(index: number) {
  return { x: index * PLAYLIST_SPACING_X, y: 0 };
}

function songPosition(index: number, playlistCount: number) {
  const row = Math.floor(index / playlistCount);
  const col = index % playlistCount;
  return { x: col * SONG_SPACING_X, y: SONG_START_Y + row * SONG_SPACING_Y };
}

/**
 * Build Graph: songs ↔ playlists
 * NOTE: we slice playlists to 5 so that the endpoint returns fast in dev.
 */
export async function buildGraph(
  req: NextRequest,
  minPlaylists = 3
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  // 1) Fetch all playlists, then take only the first 5 for quick dev iteration
  let playlists = await fetchAllPlaylists(req);
  playlists = playlists.slice(0, 5); // ▶ SLICE TO 5

  // 2) Map trackID → Set<playlistID>, and trackID → {name, image}
  const songToPlaylists = new Map<string, Set<string>>();
  const trackInfoMap = new Map<
    string,
    { name: string; image: string | undefined }
  >();

  // 2a) For each playlist, fetch its tracks
  for (const playlist of playlists) {
    // If one playlist fails, we catch and skip it rather than abort everything
    try {
      let url = `${SPOTIFY_API}/playlists/${playlist.id}/tracks?limit=100`;
      while (url) {
        const accessToken = await getSpotifyToken(req);
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch tracks for playlist ${playlist.id}`);
        }
        const data = (await res.json()) as SpotifyApi.PlaylistTrackResponse;

        data.items.forEach((item) => {
          const t = item.track;
          if (!t || typeof t === "string" || !t.id) return;

          // Add this playlist to the song’s set
          const existingSet = songToPlaylists.get(t.id) ?? new Set<string>();
          existingSet.add(playlist.id);
          songToPlaylists.set(t.id, existingSet);

          // Store track name + album‐art if not already stored
          if (!trackInfoMap.has(t.id)) {
            const albumImg = t.album.images[1]?.url ?? t.album.images[0]?.url;
            trackInfoMap.set(t.id, { name: t.name, image: albumImg });
          }
        });

        url = data.next ?? "";
      }
    } catch (plErr) {
      console.warn(
        `⚠️ Skipping playlist "${playlist.name}" (${playlist.id}):`,
        (plErr as Error).message
      );
      // Continue to next playlist
      continue;
    }
  }

  // 3) Build nodes & edges
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // 3a) One node per playlist, with its cover image and deterministic position
  playlists.forEach((pl, index) => {
    const coverUrl = pl.images[0]?.url;
    nodes.push({
      id: pl.id,
      data: {
        label: pl.name,
        image: coverUrl,
        isPlaylist: true,
      },
      type: "playlist",
      style: { width: 180 },
      position: playlistPosition(index),
    });
  });

  // 3b) One node per song (only those in ≥ minPlaylists playlists)
  let songIndex = 0;
  songToPlaylists.forEach((playlistSet, trackId) => {
    if (playlistSet.size < minPlaylists) return;

    const info = trackInfoMap.get(trackId)!;
    nodes.push({
      id: trackId,
      data: {
        label: info.name,
        image: info.image,
        isPlaylist: false,
      },
      type: "song",
      style: { width: 60 + playlistSet.size * 8 },
      position: songPosition(songIndex, playlists.length),
    });

    // 3c) Edges from each playlist → this song
    playlistSet.forEach((plId) => {
      edges.push({
        id: `${plId}-${trackId}`,
        source: plId,
        target: trackId,
        sourceHandle: "playlist-source",
        targetHandle: "song-target",
      });
    });

    songIndex++;
  });

  return { nodes, edges };
}
