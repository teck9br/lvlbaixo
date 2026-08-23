import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/** GET /api/rooms — the fixed channel list, ordered for the sidebar. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("rooms")
      .select("id, name, slug, type, category, position, topic")
      .order("position", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ rooms: data ?? [] });
  } catch (err) {
    console.error("[api/rooms] falha ao buscar salas:", err);
    return NextResponse.json(
      { error: "Não foi possível carregar os canais." },
      { status: 503 },
    );
  }
}
