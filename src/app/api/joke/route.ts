import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Tell me a short joke." }],
      }),
    });

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("OpenAI joke error:", err);
    return NextResponse.json({ error: "Failed to fetch joke" }, { status: 500 });
  }
}
