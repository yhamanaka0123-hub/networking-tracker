"use client";

import { useState } from "react";
import { PRIORITIES, contactInputSchema, type ContactInput } from "@/lib/contactSchema";
import type { Contact } from "@/lib/types";

const emptyForm: ContactInput = {
  name: "",
  company: "",
  role: "",
  met_where: "",
  notes: "",
  priority: "medium",
};

export function ContactForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Contact;
  onSubmit: (input: ContactInput) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<ContactInput>(
    initial
      ? {
          name: initial.name,
          company: initial.company ?? "",
          role: initial.role ?? "",
          met_where: initial.met_where ?? "",
          notes: initial.notes ?? "",
          priority: initial.priority,
        }
      : emptyForm,
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof ContactInput>(key: K, value: ContactInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Client-side validation for immediate feedback; the API route
    // re-validates the same rules server-side as the trusted check.
    const parsed = contactInputSchema.safeParse(form);
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }
    setFieldErrors({});
    setBusy(true);
    const serverError = await onSubmit(parsed.data);
    setBusy(false);
    if (serverError) setFormError(serverError);
  }

  return (
    <form className="card flex flex-col gap-3" onSubmit={handleSubmit}>
      <div>
        <label className="field-label" htmlFor="cf-name">
          Name *
        </label>
        <input
          id="cf-name"
          className="field-input"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          required
        />
        {fieldErrors.name && <p className="text-danger text-xs mt-1 pl-4">{fieldErrors.name.join(", ")}</p>}
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="field-label" htmlFor="cf-company">
            Company
          </label>
          <input
            id="cf-company"
            className="field-input"
            value={form.company}
            onChange={(e) => update("company", e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="field-label" htmlFor="cf-role">
            Role
          </label>
          <input id="cf-role" className="field-input" value={form.role} onChange={(e) => update("role", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="cf-met-where">
          Where you met
        </label>
        <input
          id="cf-met-where"
          className="field-input"
          placeholder="e.g. Career fair, LinkedIn, mutual friend"
          value={form.met_where}
          onChange={(e) => update("met_where", e.target.value)}
        />
      </div>
      <div>
        <label className="field-label" htmlFor="cf-priority">
          Priority *
        </label>
        <select
          id="cf-priority"
          className="field-input"
          value={form.priority}
          onChange={(e) => update("priority", e.target.value as ContactInput["priority"])}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {fieldErrors.priority && (
          <p className="text-danger text-xs mt-1 pl-4">{fieldErrors.priority.join(", ")}</p>
        )}
      </div>
      <div>
        <label className="field-label" htmlFor="cf-notes">
          Notes
        </label>
        <textarea
          id="cf-notes"
          className="field-input min-h-16 resize-y"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>
      {formError && <p className="text-danger text-sm">{formError}</p>}
      <div className="flex gap-3 flex-wrap">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : initial ? "Save changes" : "Add contact"}
        </button>
        {onCancel && (
          <button className="btn" type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
