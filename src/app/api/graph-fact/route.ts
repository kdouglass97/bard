import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { nodes } = await req.json();

    const prompt = `The following JSON array describes nodes of a playlist graph. Each node has a data.isPlaylist boolean. How many nodes have data.isPlaylist true? Answer with a short sentence.\nJSON:\n${JSON.stringify(nodes)}`;

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
    console.error("OpenAI graph-fact error:", err);
    return NextResponse.json(
      { error: "Failed to fetch graph fact" },
      { status: 500 }
    );
  }
}
