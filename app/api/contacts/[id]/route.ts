import { NextResponse } from "next/server";
import { contactInputSchema } from "@/lib/contactSchema";
import { pool } from "@/lib/db";
import { getVerifiedUser } from "@/lib/session";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// PATCH /api/contacts/:id — edit a contact. Ownership is enforced with an
// explicit WHERE user_id = $verifiedId, since this route connects to
// Postgres as the table owner (bypasses RLS by default).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getVerifiedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid contact id." }, { status: 400 });
  }

  const json = await request.json().catch(() => null);
  const parsed = contactInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, company, role, met_where, notes, priority } = parsed.data;

  const { rows } = await pool.query(
    `UPDATE contacts
     SET name = $1, company = $2, role = $3, met_where = $4, notes = $5,
         priority = $6, updated_at = now()
     WHERE id = $7 AND user_id = $8
     RETURNING id, name, company, role, met_where, notes, priority, created_at, updated_at`,
    [name, company || null, role || null, met_where || null, notes || null, priority, id, user.id],
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }

  return NextResponse.json({ contact: rows[0] });
}

// DELETE /api/contacts/:id
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getVerifiedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid contact id." }, { status: 400 });
  }

  const { rowCount } = await pool.query(
    `DELETE FROM contacts WHERE id = $1 AND user_id = $2`,
    [id, user.id],
  );

  if (rowCount === 0) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
