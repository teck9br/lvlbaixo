import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getServerName } from "@/lib/auth/password";
import { clearSessionCookie, getSession, setSessionCookie } from "@/lib/auth/session";
import { sanitizeUsername } from "@/lib/utils";

const loginSchema = z.object({
  userId: z.string().uuid(),
  username: z.string().min(1).max(32),
});

/** GET /api/auth — checks whether the current cookie is a valid session. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const serverName = await getServerName();
  return NextResponse.json({ user: session, serverName });
}

/** POST /api/auth — opens a session for the given local identity. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const username = sanitizeUsername(parsed.data.username);
  if (!username) {
    return NextResponse.json({ error: "Nome inválido." }, { status: 400 });
  }

  const { userId } = parsed.data;

  try {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: fetchError } = await supabase
      .from("users")
      .select("id, is_banned")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existing?.is_banned) {
      return NextResponse.json({ error: "Você não tem acesso a este servidor." }, { status: 403 });
    }

    if (existing) {
      await supabase
        .from("users")
        .update({ username, last_seen_at: new Date().toISOString() })
        .eq("id", userId);
    } else {
      const { error: insertError } = await supabase
        .from("users")
        .insert({ id: userId, username });
      if (insertError) throw insertError;
    }
  } catch (err) {
    console.error("[api/auth] falha ao gravar usuário:", err);
    return NextResponse.json(
      { error: "Não foi possível conectar ao banco de dados. Tente novamente." },
      { status: 503 },
    );
  }

  await setSessionCookie({ userId, username });
  const serverName = await getServerName();
  return NextResponse.json({ user: { userId, username }, serverName });
}

/** DELETE /api/auth — logs out (clears the session cookie). */
export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

const renameSchema = z.object({ username: z.string().min(1).max(32) });

/** PATCH /api/auth — renames the current user (requires an existing session). */
export async function PATCH(req: NextRequest) {
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

  const parsed = renameSchema.safeParse(body);
  const username = parsed.success ? sanitizeUsername(parsed.data.username) : null;
  if (!username) {
    return NextResponse.json({ error: "Nome inválido." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("users")
      .update({ username, last_seen_at: new Date().toISOString() })
      .eq("id", session.userId);
    if (error) throw error;
  } catch (err) {
    console.error("[api/auth] falha ao renomear usuário:", err);
    return NextResponse.json({ error: "Não foi possível alterar o nome." }, { status: 503 });
  }

  await setSessionCookie({ userId: session.userId, username });
  return NextResponse.json({ user: { userId: session.userId, username } });
}
