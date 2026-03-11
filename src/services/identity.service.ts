import { query } from "../config/db";
import { Contact, IdentifyResponse } from "../types/contact.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find all contacts where email or phoneNumber matches. */
const findMatchingContacts = async (
  email?: string,
  phoneNumber?: string
): Promise<Contact[]> => {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (email) {
    conditions.push(`email = $${idx++}`);
    params.push(email);
  }
  if (phoneNumber) {
    conditions.push(`phone_number = $${idx++}`);
    params.push(phoneNumber);
  }

  if (conditions.length === 0) return [];

  const sql = `
    SELECT * FROM contacts
    WHERE deleted_at IS NULL AND (${conditions.join(" OR ")})
    ORDER BY created_at ASC;
  `;

  const result = await query(sql, params);
  return result.rows as Contact[];
};

/** Resolve the root primary contact for a given contact. */
const getPrimaryContact = async (contact: Contact): Promise<Contact> => {
  if (contact.link_precedence === "primary") return contact;
  const result = await query(
    "SELECT * FROM contacts WHERE id = $1 AND deleted_at IS NULL",
    [contact.linked_id]
  );
  return result.rows[0] as Contact;
};

/** Get all contacts in a link group given the primary contact's id. */
const getContactGroup = async (primaryId: number): Promise<Contact[]> => {
  const result = await query(
    `SELECT * FROM contacts
     WHERE deleted_at IS NULL AND (id = $1 OR linked_id = $1)
     ORDER BY created_at ASC;`,
    [primaryId]
  );
  return result.rows as Contact[];
};

/** Build the consolidated API response from a contact group. */
const buildResponse = (contacts: Contact[]): IdentifyResponse => {
  const primary = contacts.find((c) => c.link_precedence === "primary")!;
  const secondaries = contacts.filter((c) => c.link_precedence === "secondary");

  // Unique emails & phones, primary's value first
  const emails: string[] = [];
  const phoneNumbers: string[] = [];

  if (primary.email) emails.push(primary.email);
  if (primary.phone_number) phoneNumbers.push(primary.phone_number);

  for (const s of secondaries) {
    if (s.email && !emails.includes(s.email)) emails.push(s.email);
    if (s.phone_number && !phoneNumbers.includes(s.phone_number))
      phoneNumbers.push(s.phone_number);
  }

  return {
    contact: {
      primaryContatctId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaries.map((s) => s.id),
    },
  };
};

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export const identifyContact = async (
  email?: string,
  phoneNumber?: string
): Promise<IdentifyResponse> => {
  const matches = await findMatchingContacts(email, phoneNumber);

  // ── Case 1: No existing contacts → create a new primary ─────────────
  if (matches.length === 0) {
    const result = await query(
      `INSERT INTO contacts (phone_number, email, link_precedence)
       VALUES ($1, $2, 'primary')
       RETURNING *;`,
      [phoneNumber ?? null, email ?? null]
    );
    const newContact = result.rows[0] as Contact;
    return buildResponse([newContact]);
  }

  // ── Resolve all distinct primary contacts in the matched set ────────
  const primaryMap = new Map<number, Contact>();

  for (const m of matches) {
    const primary = await getPrimaryContact(m);
    primaryMap.set(primary.id, primary);
  }

  const primaries = [...primaryMap.values()].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // ── Case 3: Matches span two different primary groups → merge ───────
  if (primaries.length > 1) {
    const keepPrimary = primaries[0]!;

    for (let i = 1; i < primaries.length; i++) {
      const demotePrimary = primaries[i]!;

      // Turn the newer primary into a secondary of the older one
      await query(
        `UPDATE contacts
         SET linked_id = $1, link_precedence = 'secondary', updated_at = NOW()
         WHERE id = $2;`,
        [keepPrimary.id, demotePrimary.id]
      );

      // Re-link all secondaries of the demoted primary
      await query(
        `UPDATE contacts
         SET linked_id = $1, updated_at = NOW()
         WHERE linked_id = $2 AND id != $2;`,
        [keepPrimary.id, demotePrimary.id]
      );
    }

    // Fetch the freshly merged group
    const group = await getContactGroup(keepPrimary.id);
    return buildResponse(group);
  }

  // ── Case 2: All matches belong to one primary group ─────────────────
  const primary = primaries[0]!;
  const group = await getContactGroup(primary.id);

  // Determine whether the request brings any *new* information
  const hasNewEmail = !!email && !group.some((c) => c.email === email);
  const hasNewPhone = !!phoneNumber && !group.some((c) => c.phone_number === phoneNumber);

  if (hasNewEmail || hasNewPhone) {
    // At least one piece of info is new → create a secondary
    await query(
      `INSERT INTO contacts (phone_number, email, linked_id, link_precedence)
       VALUES ($1, $2, $3, 'secondary')
       RETURNING *;`,
      [phoneNumber ?? null, email ?? null, primary.id]
    );
  }

  // Re-fetch the (possibly updated) group
  const finalGroup = await getContactGroup(primary.id);
  return buildResponse(finalGroup);
};
