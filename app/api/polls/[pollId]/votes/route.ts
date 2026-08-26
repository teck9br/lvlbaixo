import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { PollOption } from "@/types";

const postSchema = z.object({ optionId: z.string().min(1).max(8) });

/**
 * POST /api/polls/:pollId/votes — casts (or changes) the caller's vote.
 * One ballot per person per poll: an upsert on (poll_id, user_id) means
 * voting again just moves the existing vote to the new option instead of
 * adding a second one.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ pollId: string }> }) {
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
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Voto inválido." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .select("id, options, closed_at")
      .eq("id", pollId)
      .maybeSingle();
    if (pollError) throw pollError;
    if (!poll) return NextResponse.json({ error: "Enquete não encontrada." }, { status: 404 });
    if (poll.closed_at) {
      return NextResponse.json({ error: "Essa enquete foi encerrada." }, { status: 400 });
    }

    const options = poll.options as PollOption[];
    if (!options.some((o) => o.id === parsed.data.optionId)) {
      return NextResponse.json({ error: "Opção inválida." }, { status: 400 });
    }

    const { data: vote, error: voteError } = await supabase
      .from("poll_votes")
      .upsert(
        {
          poll_id: pollId,
          option_id: parsed.data.optionId,
          user_id: session.userId,
          username: session.username,
        },
        { onConflict: "poll_id,user_id" },
      )
      .select("id, poll_id, option_id, user_id, username, created_at")
      .single();
    if (voteError) throw voteError;

    return NextResponse.json({ vote });
  } catch (err) {
    console.error("[api/polls/[pollId]/votes] falha ao votar:", err);
    return NextResponse.json({ error: "Não foi possível registrar o voto." }, { status: 503 });
  }
}

/** DELETE /api/polls/:pollId/votes — retracts the caller's own vote. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ pollId: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { pollId } = await params;

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("poll_votes")
      .delete()
      .eq("poll_id", pollId)
      .eq("user_id", session.userId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/polls/[pollId]/votes] falha ao remover voto:", err);
    return NextResponse.json({ error: "Não foi possível remover o voto." }, { status: 503 });
  }
}
