import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function getServerName(): Promise<string> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("server_settings")
      .select("server_name")
      .eq("id", 1)
      .maybeSingle();
    if (data?.server_name) return data.server_name;
  } catch {
    // ignore, use fallback below
  }
  return process.env.NEXT_PUBLIC_APP_NAME || "lvlbaixo";
}
