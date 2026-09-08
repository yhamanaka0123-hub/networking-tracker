"use client";

import { PRIORITIES } from "@/lib/contactSchema";

export type SortField = "name" | "priority" | "created_at";
export type SortOrder = "asc" | "desc";

export interface FilterState {
  sort: SortField;
  order: SortOrder;
  priority: "" | (typeof PRIORITIES)[number];
  q: string;
}

export function SortFilterBar({
  value,
  onChange,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 mb-4">
      <div className="min-w-36 flex-1 sm:flex-none">
        <label className="field-label" htmlFor="ff-search">
          Search
        </label>
        <input
          id="ff-search"
          className="field-input"
          placeholder="Name…"
          value={value.q}
          onChange={(e) => onChange({ ...value, q: e.target.value })}
        />
      </div>
      <div className="min-w-36 flex-1 sm:flex-none">
        <label className="field-label" htmlFor="ff-priority">
          Priority
        </label>
        <select
          id="ff-priority"
          className="field-input"
          value={value.priority}
          onChange={(e) => onChange({ ...value, priority: e.target.value as FilterState["priority"] })}
        >
          <option value="">All</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-36 flex-1 sm:flex-none">
        <label className="field-label" htmlFor="ff-sort">
          Sort by
        </label>
        <select
          id="ff-sort"
          className="field-input"
          value={value.sort}
          onChange={(e) => onChange({ ...value, sort: e.target.value as SortField })}
        >
          <option value="created_at">Date added</option>
          <option value="name">Name</option>
          <option value="priority">Priority</option>
        </select>
      </div>
      <div className="min-w-36 flex-1 sm:flex-none">
        <label className="field-label" htmlFor="ff-order">
          Order
        </label>
        <select
          id="ff-order"
          className="field-input"
          value={value.order}
          onChange={(e) => onChange({ ...value, order: e.target.value as SortOrder })}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>
    </div>
  );
}
