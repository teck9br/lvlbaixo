import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const postSchema = z.object({
  roomId: z.string().uuid(),
  content: z.string().min(1).max(4000),
});

/** GET /api/messages?roomId=... — recent history for a text room. */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const roomId = req.nextUrl.searchParams.get("roomId");
  if (!roomId) {
    return NextResponse.json({ error: "roomId é obrigatório." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("messages")
      .select("id, room_id, user_id, username, content, created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json({ messages: (data ?? []).reverse() });
  } catch (err) {
    console.error("[api/messages] falha ao buscar mensagens:", err);
    return NextResponse.json(
      { error: "Não foi possível carregar as mensagens." },
      { status: 503 },
    );
  }
}

/** POST /api/messages — sends a chat message. Requires a valid session. */
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

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Mensagem inválida." }, { status: 400 });
  }

  const content = parsed.data.content.trim();
  if (!content) {
    return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, type")
      .eq("id", parsed.data.roomId)
      .maybeSingle();

    if (roomError) throw roomError;
    if (!room || room.type !== "text") {
      return NextResponse.json({ error: "Canal de texto inválido." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        room_id: parsed.data.roomId,
        user_id: session.userId,
        username: session.username,
        content,
      })
      .select("id, room_id, user_id, username, content, created_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ message: data });
  } catch (err) {
    console.error("[api/messages] falha ao enviar mensagem:", err);
    return NextResponse.json(
      { error: "Não foi possível enviar a mensagem." },
      { status: 503 },
    );
  }
}
