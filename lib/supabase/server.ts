import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client, authenticated with the service role key.
 * This bypasses Row Level Security entirely, so it must NEVER be imported
 * from a "use client" component or leaked to the browser bundle — the
 * "server-only" import above makes any accidental client import a build
 * error.
 *
 * Every write in this app (users, messages, rooms admin) goes through
 * this client from within an API route, after the route has verified the
 * caller's session cookie (see lib/auth/session.ts).
 */
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase não está configurado: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
