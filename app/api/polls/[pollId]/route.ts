import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/polls/:pollId — a single poll plus its current votes. Used when
 * a realtime chat event announces a poll message this tab hasn't fetched
 * yet (the INSERT payload only carries the message row, not the poll's
 * question/options/votes).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ pollId: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { pollId } = await params;

  try {
    const supabase = getSupabaseAdmin();
    const [pollRes, votesRes] = await Promise.all([
      supabase
        .from("polls")
        .select(
          "id, room_id, question, options, created_by_user_id, created_by_username, created_at, closed_at",
        )
        .eq("id", pollId)
        .maybeSingle(),
      supabase
        .from("poll_votes")
        .select("id, poll_id, option_id, user_id, username, created_at")
        .eq("poll_id", pollId),
    ]);

    if (pollRes.error) throw pollRes.error;
    if (votesRes.error) throw votesRes.error;
    if (!pollRes.data) {
      return NextResponse.json({ error: "Enquete não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ poll: pollRes.data, votes: votesRes.data ?? [] });
  } catch (err) {
    console.error("[api/polls/[pollId]] falha ao buscar enquete:", err);
    return NextResponse.json({ error: "Não foi possível carregar a enquete." }, { status: 503 });
  }
}

const patchSchema = z.object({ closed: z.literal(true) });

/** PATCH /api/polls/:pollId — closes a poll. Only its creator can. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ pollId: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { pollId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .select("id, created_by_user_id, closed_at")
      .eq("id", pollId)
      .maybeSingle();
    if (pollError) throw pollError;
    if (!poll) return NextResponse.json({ error: "Enquete não encontrada." }, { status: 404 });
    if (poll.created_by_user_id !== session.userId) {
      return NextResponse.json(
        { error: "Só quem criou a enquete pode encerrá-la." },
        { status: 403 },
      );
    }
    if (poll.closed_at) {
      return NextResponse.json({ poll });
    }

    const { data: updated, error: updateError } = await supabase
      .from("polls")
      .update({ closed_at: new Date().toISOString() })
      .eq("id", pollId)
      .select(
        "id, room_id, question, options, created_by_user_id, created_by_username, created_at, closed_at",
      )
      .single();
    if (updateError) throw updateError;

    return NextResponse.json({ poll: updated });
  } catch (err) {
    console.error("[api/polls/[pollId]] falha ao encerrar enquete:", err);
    return NextResponse.json({ error: "Não foi possível encerrar a enquete." }, { status: 503 });
  }
}
