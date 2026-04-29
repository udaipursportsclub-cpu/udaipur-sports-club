import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { base64, mimeType } = await request.json();
  if (!base64) return NextResponse.json({ error: "No image data" }, { status: 400 });

  const body = new URLSearchParams({
    key:    "6d207e02198a847aa98d0a2a901485a5",
    source: base64,
    format: "json",
    ...(mimeType ? { type: mimeType } : {}),
  });

  const res  = await fetch("https://freeimage.host/api/1/upload", { method: "POST", body });
  const json = await res.json();
  const url  = json?.image?.url;

  if (!url) return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  return NextResponse.json({ url });
}
