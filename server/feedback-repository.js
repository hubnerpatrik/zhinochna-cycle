export function createFeedbackRepository(sql) {
  return {
    async list(userId, admin) {
      return sql`SELECT id, anchor, resolved, messages, created_at AS "createdAt"
        FROM cycle_private.feedback WHERE owner_id = ${userId} OR ${admin}
        ORDER BY updated_at DESC LIMIT 200`;
    },
    async write(userId, admin, input) {
      const message = { id: input.messageId || input.id, author: admin ? 'Support' : 'Author', text: input.text, at: new Date().toISOString() };
      if (input.action === 'create') {
        const rows = await sql`INSERT INTO cycle_private.feedback AS current (id, owner_id, anchor, messages)
          VALUES (${input.id}::uuid, ${userId}, ${JSON.stringify(input.anchor)}::jsonb, ${JSON.stringify([message])}::jsonb)
          ON CONFLICT (id) DO UPDATE SET id = current.id WHERE current.owner_id = ${userId}
          RETURNING id, anchor, resolved, messages, created_at AS "createdAt"`;
        return rows[0];
      }
      if (input.action === 'resolve') {
        const rows = await sql`UPDATE cycle_private.feedback SET resolved = ${input.resolved}, updated_at = now()
          WHERE id = ${input.id}::uuid AND (owner_id = ${userId} OR ${admin})
          RETURNING id, anchor, resolved, messages, created_at AS "createdAt"`;
        return rows[0];
      }
      const rows = await sql`UPDATE cycle_private.feedback SET
        messages = CASE WHEN messages @> ${JSON.stringify([{ id: input.messageId }])}::jsonb THEN messages
          ELSE messages || ${JSON.stringify([message])}::jsonb END, updated_at = now()
        WHERE id = ${input.id}::uuid AND (owner_id = ${userId} OR ${admin})
          AND (jsonb_array_length(messages) < 100 OR messages @> ${JSON.stringify([{ id: input.messageId }])}::jsonb)
        RETURNING id, anchor, resolved, messages, created_at AS "createdAt"`;
      return rows[0];
    },
  };
}
