import { NextRequest, NextResponse } from "next/server";
import { fetchRecentTracks } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  try {
    const recent = await fetchRecentTracks(req, 20);
    const trackLines = recent.map((item, i) => {
      const t = item.track;
      if (!t || typeof t === "string" || !t.id) return `${i + 1}. Unknown`;
      const artists = t.artists.map((a) => a.name).join(", ");
      return `${i + 1}. ${t.name} — ${artists}`;
    });

    const prompt = `You are a playful music critic. Here are some songs a Spotify user recently listened to:\n${trackLines.join("\n")}\n\nRoast the user's taste based on this list, then give a genuine validation or compliment. Respond in two short paragraphs.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("OpenAI listening feedback error:", err);
    return NextResponse.json(
      { error: "Failed to fetch AI feedback" },
      { status: 500 }
    );
  }
}
