// src/app/api/spotify/graph/route.ts
import { NextResponse, NextRequest } from "next/server";
import { buildGraph } from "@/lib/graph";

export async function GET(request: NextRequest) {
  try {
    const { nodes, edges } = await buildGraph(request);
    return NextResponse.json(
      { nodes, edges },
      {
        status: 200,
        // optional for caching: "public, max-age=0, s-maxage=1800"
      }
    );
  } catch (err: any) {
    // Log the full error server‐side so you can inspect it in your terminal
    console.error("❌ buildGraph error:", err);

    // Return a JSON with a real message, or String(err) if message is missing
    const message = err?.message ? err.message : String(err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
