export function createShareMapRepository(sql) {
  return {
    async read(id) {
      const [row] = await sql`SELECT map FROM cycle_private.shared_maps WHERE id = ${id}::uuid AND expires_at > now()`;
      return row?.map ?? null;
    },
    // Expired links are removed first; the count and insert run in one transaction.
    async create(ownerId, id, map, maxActive) {
      const [, , inserted] = await sql.transaction([
        sql`DELETE FROM cycle_private.shared_maps WHERE expires_at <= now()`,
        sql`SELECT pg_advisory_xact_lock(hashtext(${ownerId}))`,
        sql`INSERT INTO cycle_private.shared_maps (id, owner_id, map)
          SELECT ${id}::uuid, ${ownerId}, ${JSON.stringify(map)}::jsonb
          WHERE (SELECT count(*) FROM cycle_private.shared_maps WHERE owner_id = ${ownerId} AND expires_at > now()) < ${maxActive}
          RETURNING id`,
      ]);
      return inserted.length > 0;
    },
  };
}
