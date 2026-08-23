import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createLiveKitToken } from "@/lib/livekit/token";
import { VOICE_ROOM_SLUGS } from "@/lib/livekit/config";

// Only these rooms may actually be joined as LiveKit rooms — the server
// enforces the same fixed voice-channel list the sidebar shows, so a
// crafted request can't join/create an arbitrary room name.
const ALLOWED_VOICE_ROOMS: readonly string[] = VOICE_ROOM_SLUGS;

const bodySchema = z.object({
  roomName: z.string().min(1).max(64),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  if (!ALLOWED_VOICE_ROOMS.includes(parsed.data.roomName)) {
    return NextResponse.json({ error: "Sala de voz desconhecida." }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_LIVEKIT_URL) {
    return NextResponse.json(
      { error: "LiveKit não está configurado no servidor." },
      { status: 503 },
    );
  }

  try {
    const token = await createLiveKitToken({
      identity: session.userId,
      name: session.username,
      roomName: parsed.data.roomName,
    });
    return NextResponse.json({ token, url: process.env.NEXT_PUBLIC_LIVEKIT_URL });
  } catch (err) {
    console.error("[api/livekit/token] falha ao gerar token:", err);
    return NextResponse.json(
      { error: "Não foi possível gerar o token de voz. Tente novamente." },
      { status: 503 },
    );
  }
}
