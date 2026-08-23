import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listVoicePresence } from "@/lib/livekit/presence";
import { VOICE_ROOM_SLUGS } from "@/lib/livekit/config";

/**
 * GET /api/livekit/presence — who's currently in each voice channel, for
 * the sidebar. Requires a session (same as every other API route) but
 * doesn't require the caller to have joined a room themselves.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const presence = await listVoicePresence(VOICE_ROOM_SLUGS);
  return NextResponse.json({ presence });
}
