import "server-only";
import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Checks the submitted server password against `server_settings` in the
 * database first (the "real" source of truth — see supabase/seed.sql),
 * falling back to the plaintext SERVER_ACCESS_PASSWORD env var if the
 * table hasn't been seeded yet. This lets the app run before you've
 * touched Supabase at all, while the DB-backed hash is what you should
 * rely on in production.
 */
export async function checkServerPassword(password: string): Promise<boolean> {
  if (!password) return false;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("server_settings")
      .select("access_password_hash")
      .eq("id", 1)
      .maybeSingle();

    if (!error && data?.access_password_hash) {
      return bcrypt.compare(password, data.access_password_hash);
    }
  } catch {
    // Supabase not configured yet or unreachable — fall through to env check.
  }

  const fallback = process.env.SERVER_ACCESS_PASSWORD;
  if (!fallback) return false;
  return password === fallback;
}

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
  return process.env.NEXT_PUBLIC_APP_NAME || "CS HUB";
}
