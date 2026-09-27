export function createStateRepository(sql) {
  return {
    async read(userId) {
      const rows = await sql`SELECT version, mutation_id AS "mutationId", data FROM cycle_private.account_state WHERE user_id = ${userId}`;
      return rows[0] || { version: 0, mutationId: null, data: null };
    },
    async write(userId, { version, mutationId, data }) {
      // Compare-and-swap is atomic even when two devices save simultaneously.
      // Retrying a request whose response was lost returns the same acknowledgement.
      const rows = await sql`
        INSERT INTO cycle_private.account_state AS current (user_id, version, mutation_id, data)
        SELECT ${userId}, 1, ${mutationId}::uuid, ${JSON.stringify(data)}::jsonb WHERE ${version} = 0
        ON CONFLICT (user_id) DO UPDATE SET
          version = CASE WHEN current.mutation_id = EXCLUDED.mutation_id THEN current.version ELSE current.version + 1 END,
          mutation_id = EXCLUDED.mutation_id,
          data = CASE WHEN current.mutation_id = EXCLUDED.mutation_id THEN current.data ELSE EXCLUDED.data END,
          updated_at = now()
        WHERE current.version = ${version} OR current.mutation_id = ${mutationId}::uuid
        RETURNING version, mutation_id AS "mutationId"`;
      if (rows[0]) return rows[0];
      // Existing documents do not take the initial INSERT path.
      const updated = await sql`
        UPDATE cycle_private.account_state SET
          version = CASE WHEN mutation_id = ${mutationId}::uuid THEN version ELSE version + 1 END,
          data = CASE WHEN mutation_id = ${mutationId}::uuid THEN data ELSE ${JSON.stringify(data)}::jsonb END,
          mutation_id = ${mutationId}::uuid, updated_at = now()
        WHERE user_id = ${userId} AND (version = ${version} OR mutation_id = ${mutationId}::uuid)
        RETURNING version, mutation_id AS "mutationId"`;
      return updated[0] || null;
    },
  };
}
