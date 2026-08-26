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
      .select("id, room_id, user_id, username, content, created_at, poll_id")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    const messages = (data ?? []).reverse();

    // Poll messages carry their question/options/votes in separate tables
    // (see 0003_polls.sql) — fetch those for whichever polls showed up in
    // this page of history so the client can render them inline.
    const pollIds = [...new Set(messages.map((m) => m.poll_id).filter((id): id is string => !!id))];
    let polls: unknown[] = [];
    let votes: unknown[] = [];
    if (pollIds.length > 0) {
      const [pollsRes, votesRes] = await Promise.all([
        supabase
          .from("polls")
          .select(
            "id, room_id, question, options, created_by_user_id, created_by_username, created_at, closed_at",
          )
          .in("id", pollIds),
        supabase
          .from("poll_votes")
          .select("id, poll_id, option_id, user_id, username, created_at")
          .in("poll_id", pollIds),
      ]);
      if (pollsRes.error) throw pollsRes.error;
      if (votesRes.error) throw votesRes.error;
      polls = pollsRes.data ?? [];
      votes = votesRes.data ?? [];
    }

    return NextResponse.json({ messages, polls, votes });
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
      .select("id, room_id, user_id, username, content, created_at, poll_id")
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
