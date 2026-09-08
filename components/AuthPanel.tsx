"use client";

import { useState } from "react";
import { neon } from "@/lib/neonClient";

export function AuthPanel({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result =
        mode === "signUp"
          ? await neon.auth.signUp.email({ email, password, name })
          : await neon.auth.signIn.email({ email, password });

      if (result.error) {
        setError(result.error.message ?? "Something went wrong.");
        return;
      }
      onSignedIn();
    } catch {
      setError("Could not reach the auth service.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card max-w-90 mx-4 my-12 sm:mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Networking Tracker</h1>
      <p className="text-muted mb-4">
        {mode === "signIn" ? "Sign in to your account." : "Create an account."}
      </p>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        {mode === "signUp" && (
          <div>
            <label className="field-label" htmlFor="name">
              Name
            </label>
            <input id="name" className="field-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div>
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="field-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="field-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        {error && <p className="text-danger text-sm">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "signIn" ? "Sign in" : "Sign up"}
        </button>
      </form>
      <p className="text-muted mt-4">
        {mode === "signIn" ? (
          <>
            No account?{" "}
            <button className="underline" type="button" onClick={() => setMode("signUp")}>
              Sign up
            </button>
          </>
        ) : (
          <>
            Have an account?{" "}
            <button className="underline" type="button" onClick={() => setMode("signIn")}>
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
