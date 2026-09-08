"use client";

import { useCallback, useEffect, useState } from "react";
import { neon } from "@/lib/neonClient";
import { clearAccessTokenCache, getAccessToken } from "@/lib/authToken";
import type { Contact } from "@/lib/types";
import type { ContactInput } from "@/lib/contactSchema";
import { ContactForm } from "@/components/ContactForm";
import { ContactList } from "@/components/ContactList";
import { SortFilterBar, type FilterState } from "@/components/SortFilterBar";

const defaultFilter: FilterState = {
  sort: "created_at",
  order: "desc",
  priority: "",
  q: "",
};

export function ContactsApp({ email, onSignedOut }: { email: string; onSignedOut: () => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>(defaultFilter);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  // Reads go straight to the Data API via the browser neon-js client; RLS
  // (auth.user_id() = user_id) is what keeps this safe.
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    let query = neon.from("contacts").select("*");
    if (filter.priority) query = query.eq("priority", filter.priority);
    if (filter.q.trim()) query = query.ilike("name", `%${filter.q.trim()}%`);
    query = query.order(filter.sort, { ascending: filter.order === "asc" });

    const { data, error } = await query;
    if (error) {
      setLoadError(error.message ?? "Could not load contacts.");
    } else {
      setContacts((data ?? []) as Contact[]);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  // Every write goes through our backend, authenticated with a Bearer JWT
  // (see lib/authToken.ts / lib/session.ts) rather than a cookie, since the
  // Auth service's session cookie lives on its own origin, not ours.
  async function authedFetch(input: string, init: RequestInit): Promise<Response | null> {
    const token = await getAccessToken();
    if (!token) return null;
    return fetch(input, {
      ...init,
      headers: { ...init.headers, authorization: `Bearer ${token}` },
    });
  }

  async function createContact(input: ContactInput): Promise<string | null> {
    const res = await authedFetch("/api/contacts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res) return "Not signed in.";
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return body?.error ?? "Could not create contact.";
    }
    setShowForm(false);
    await load();
    return null;
  }

  async function updateContact(id: number, input: ContactInput): Promise<string | null> {
    const res = await authedFetch(`/api/contacts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res) return "Not signed in.";
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return body?.error ?? "Could not save changes.";
    }
    setEditing(null);
    await load();
    return null;
  }

  async function deleteContact(contact: Contact) {
    if (!confirm(`Delete ${contact.name}?`)) return;
    const res = await authedFetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
    if (res?.ok) await load();
  }

  async function signOut() {
    await neon.auth.signOut();
    clearAccessTokenCache();
    onSignedOut();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-5 pt-8 pb-16">
      <div className="flex justify-between items-center gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Networking Tracker</h1>
          <p className="text-muted">Signed in as {email}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditing(null);
              setShowForm((s) => !s);
            }}
          >
            {showForm ? "Close" : "Add contact"}
          </button>
          <button className="btn" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>

      {showForm && !editing && (
        <div className="mb-6">
          <ContactForm onSubmit={createContact} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {editing && (
        <div className="mb-6">
          <ContactForm
            initial={editing}
            onSubmit={(input) => updateContact(editing.id, input)}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <SortFilterBar value={filter} onChange={setFilter} />

      {loading && <p className="text-muted">Loading…</p>}
      {loadError && <p className="text-danger text-sm">{loadError}</p>}
      {!loading && !loadError && (
        <ContactList
          contacts={contacts}
          onEdit={(c) => {
            setShowForm(false);
            setEditing(c);
          }}
          onDelete={deleteContact}
        />
      )}
    </div>
  );
}
