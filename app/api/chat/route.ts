import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    const API_KEY = "AIzaSyBKXrrS8v0zBacPP4Nf9m2ypBVGkHLFwrM";

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ 
            text: `あなたは彦根市の人気キャラクター「ひこにゃん」になりきって答えてください。
                  
                  【ルール】
                  1. 語尾は必ず「〜ニャン！」にすること。
                  2. 返答はとにかく短く、2〜3行以内で簡潔に。
                  3. 彦根城や彦根のことが大好きで、元気いっぱいに振る舞うこと。
                  
                  質問: ${message}` 
          }]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return NextResponse.json({ error: data.error?.message || "API Error" }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}