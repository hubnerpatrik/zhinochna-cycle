import { isStoredProfilePhoto } from '../profile-photo.js';

export function createFeedbackRepository(sql) {
  async function withAuthors(rows) {
    if (!rows.length) return rows;
    // Only the participants of already authorized threads are looked up. Never return account data.
    const authorId = (row, message) => message.authorId || (message.author === 'Author' ? row.ownerId : null);
    const ids = [...new Set(rows.flatMap(row => row.messages.map(message => authorId(row, message))).filter(Boolean))];
    const profiles = ids.length ? await sql`SELECT user_id AS id,
      data->'profile'->>'name' AS name, data->'profile'->>'photo' AS photo
      FROM cycle_private.account_state WHERE user_id IN
        (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))` : [];
    const byId = new Map(profiles.map(profile => [profile.id, profile]));
    return rows.map(row => {
      const { ownerId, ...thread } = row;
      return { ...thread, messages: row.messages.map(message => {
        const profile = byId.get(authorId(row, message));
        const { authorId: privateId, ...publicMessage } = message;
        void privateId;
        return { ...publicMessage,
          authorName: typeof profile?.name === 'string' ? profile.name.trim().slice(0, 160) : '',
          authorPhoto: isStoredProfilePhoto(profile?.photo) ? profile.photo : '',
        };
      }) };
    });
  }
  return {
    async list(userId, admin) {
      const rows = await sql`SELECT id, owner_id AS "ownerId", anchor, resolved, messages, created_at AS "createdAt"
        FROM cycle_private.feedback WHERE owner_id = ${userId} OR ${admin}
        ORDER BY updated_at DESC LIMIT 200`;
      return withAuthors(rows);
    },
    async write(userId, admin, input) {
      if (input.action === 'resolve' && !admin) return null;
      const message = { id: input.messageId || input.id, authorId: userId, author: admin ? 'Support' : 'Author', text: input.text, at: new Date().toISOString() };
      if (input.action === 'create') {
        const rows = await sql`INSERT INTO cycle_private.feedback AS current (id, owner_id, anchor, messages)
          VALUES (${input.id}::uuid, ${userId}, ${JSON.stringify(input.anchor)}::jsonb, ${JSON.stringify([message])}::jsonb)
          ON CONFLICT (id) DO UPDATE SET id = current.id WHERE current.owner_id = ${userId}
          RETURNING id, owner_id AS "ownerId", anchor, resolved, messages, created_at AS "createdAt"`;
        return (await withAuthors(rows))[0];
      }
      if (input.action === 'resolve') {
        const rows = await sql`UPDATE cycle_private.feedback SET resolved = ${input.resolved}, updated_at = now()
          WHERE id = ${input.id}::uuid AND ${admin}
          RETURNING id, owner_id AS "ownerId", anchor, resolved, messages, created_at AS "createdAt"`;
        return (await withAuthors(rows))[0];
      }
      const rows = await sql`UPDATE cycle_private.feedback SET
        messages = CASE WHEN messages @> ${JSON.stringify([{ id: input.messageId }])}::jsonb THEN messages
          ELSE messages || ${JSON.stringify([message])}::jsonb END, updated_at = now()
        WHERE id = ${input.id}::uuid AND (owner_id = ${userId} OR ${admin})
          AND (jsonb_array_length(messages) < 100 OR messages @> ${JSON.stringify([{ id: input.messageId }])}::jsonb)
        RETURNING id, owner_id AS "ownerId", anchor, resolved, messages, created_at AS "createdAt"`;
      return (await withAuthors(rows))[0];
    },
  };
}
