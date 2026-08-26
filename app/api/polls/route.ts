import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { PollOption } from "@/types";

const postSchema = z.object({
  roomId: z.string().uuid(),
  question: z.string().min(1).max(300),
  options: z.array(z.string().min(1).max(80)).min(2).max(8),
});

/**
 * POST /api/polls — creates a poll and, in the same call, the chat message
 * that anchors it in the room's timeline (see 0003_polls.sql: a poll
 * message has `poll_id` set and `content` left null). Returns both rows
 * plus an empty `votes` array so the caller can render it immediately
 * without a second round trip.
 */
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
    return NextResponse.json({ error: "Enquete inválida." }, { status: 400 });
  }

  const question = parsed.data.question.trim();
  const options: PollOption[] = parsed.data.options
    .map((label, i) => ({ id: String(i), label: label.trim() }))
    .filter((o) => o.label.length > 0);

  if (!question) {
    return NextResponse.json({ error: "A enquete precisa de uma pergunta." }, { status: 400 });
  }
  if (options.length < 2) {
    return NextResponse.json(
      { error: "A enquete precisa de pelo menos 2 opções." },
      { status: 400 },
    );
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

    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .insert({
        room_id: parsed.data.roomId,
        question,
        options,
        created_by_user_id: session.userId,
        created_by_username: session.username,
      })
      .select(
        "id, room_id, question, options, created_by_user_id, created_by_username, created_at, closed_at",
      )
      .single();

    if (pollError) throw pollError;

    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        room_id: parsed.data.roomId,
        user_id: session.userId,
        username: session.username,
        content: null,
        poll_id: poll.id,
      })
      .select("id, room_id, user_id, username, content, created_at, poll_id")
      .single();

    if (messageError) {
      // The poll was created but its anchor message failed — don't leave an
      // orphaned poll no message will ever point to.
      await supabase.from("polls").delete().eq("id", poll.id);
      throw messageError;
    }

    return NextResponse.json({ message, poll, votes: [] });
  } catch (err) {
    console.error("[api/polls] falha ao criar enquete:", err);
    return NextResponse.json({ error: "Não foi possível criar a enquete." }, { status: 503 });
  }
}
