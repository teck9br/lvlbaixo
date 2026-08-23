// Test-only stub for the "server-only" import guard package. In the real
// app this package throws if accidentally bundled into client code; under
// Vitest (plain Node, no bundler) we just want it to be a no-op so that
// server modules (lib/auth/*, lib/livekit/token.ts, lib/supabase/server.ts)
// can be imported directly in unit tests.
export {};
