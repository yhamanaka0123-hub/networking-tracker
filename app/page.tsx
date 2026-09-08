"use client";

import { useCallback, useEffect, useState } from "react";
import { neon } from "@/lib/neonClient";
import { AuthPanel } from "@/components/AuthPanel";
import { ContactsApp } from "@/components/ContactsApp";

export default function Home() {
  const [email, setEmail] = useState<string | null | undefined>(undefined); // undefined = loading

  const checkSession = useCallback(async () => {
    const { data } = await neon.auth.getSession();
    setEmail(data?.user?.email ?? null);
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (email === undefined) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-5 pt-8 pb-16">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  if (!email) {
    return <AuthPanel onSignedIn={checkSession} />;
  }

  return <ContactsApp email={email} onSignedOut={() => setEmail(null)} />;
}
