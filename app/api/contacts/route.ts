import { NextResponse } from "next/server";
import { contactInputSchema } from "@/lib/contactSchema";
import { pool } from "@/lib/db";
import { getVerifiedUser } from "@/lib/session";

// POST /api/contacts — create a contact for the signed-in caller.
// "Backend logic": verifies the caller server-side, validates the body
// with the shared Zod schema, then writes it with the verified user id
// (never a client-supplied one).
export async function POST(request: Request) {
  const user = await getVerifiedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
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
    `INSERT INTO contacts (user_id, name, company, role, met_where, notes, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, company, role, met_where, notes, priority, created_at, updated_at`,
    [user.id, name, company || null, role || null, met_where || null, notes || null, priority],
  );

  return NextResponse.json({ contact: rows[0] }, { status: 201 });
}
