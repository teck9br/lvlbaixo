// Minimal fake for the subset of the Supabase query builder our API routes
// use (from().select().eq().maybeSingle() / .order() / .limit() / .insert()
// .select().single() / .update().eq() / .upsert() / .delete() / .in()).
// Each table gets one canned {data, error} result, reused across every
// chained call for that table — enough for the simple, single-purpose
// queries in our route handlers.
export function makeQuery(result: { data: unknown; error: unknown }) {
  const self = {
    select: () => self,
    eq: () => self,
    in: () => self,
    order: () => self,
    limit: () => self,
    insert: () => self,
    update: () => self,
    upsert: () => self,
    delete: () => self,
    maybeSingle: async () => result,
    single: async () => result,
    then: (resolve: (v: typeof result) => void, reject?: (e: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return self;
}

export function makeFakeSupabase(tableResults: Record<string, { data: unknown; error: unknown }>) {
  return {
    from: (table: string) => makeQuery(tableResults[table] ?? { data: null, error: null }),
  };
}
