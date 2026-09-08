"use client";

import type { Contact } from "@/lib/types";

export function ContactList({
  contacts,
  onEdit,
  onDelete,
}: {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}) {
  if (contacts.length === 0) {
    return <p className="text-muted">No contacts match yet.</p>;
  }

  return (
    <ul className="list-none m-0 mt-4 p-0 flex flex-col gap-3">
      {contacts.map((c) => (
        <li className="card !p-4" key={c.id}>
          <div className="flex justify-between items-baseline gap-2 flex-wrap">
            <span className="font-semibold">{c.name}</span>
            <span className={`badge badge-${c.priority}`}>{c.priority}</span>
          </div>
          <div className="text-muted text-sm mt-1">
            {[c.role, c.company].filter(Boolean).join(" at ") || null}
            {c.met_where && (
              <>
                {" "}
                &middot; Met at {c.met_where}
              </>
            )}
          </div>
          {c.notes && <div className="mt-2 text-sm whitespace-pre-wrap">{c.notes}</div>}
          <div className="mt-3 flex gap-2 flex-wrap">
            <button className="btn" onClick={() => onEdit(c)}>
              Edit
            </button>
            <button className="btn btn-danger" onClick={() => onDelete(c)}>
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
