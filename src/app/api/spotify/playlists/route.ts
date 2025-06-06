// src/app/api/spotify/playlists/route.ts
import { NextResponse, NextRequest } from "next/server";
import { fetchAllPlaylists } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  try {
    const playlists = await fetchAllPlaylists(request);
    return NextResponse.json({ playlists });
  } catch (err) {
    // If any error occurs (e.g. no token, fetch failed), return a 500 + message
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
