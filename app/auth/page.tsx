"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const message = searchParams.get("message");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setStatus(null);

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setStatus(error.message);
          return;
        }

        router.push("/rounds/new");
        router.refresh();
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setStatus(error.message);
        return;
      }

      setStatus("Sign-up successful. Check your email if confirmation is required.");
    } finally {
      setIsLoading(false);
    }
  }

  async function onSignOut() {
    setIsLoading(true);
    setStatus(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setStatus(error.message);
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Auth</h1>
        <p className="text-sm text-zinc-600">
          Minimal auth flow for Phase 3 round creation.
        </p>
      </header>

      {message ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {message}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-zinc-200 p-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("sign-in")}
            className={`rounded px-3 py-1 text-sm ${mode === "sign-in" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("sign-up")}
            className={`rounded px-3 py-1 text-sm ${mode === "sign-up" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}
          >
            Sign up
          </button>
        </div>

        <label className="block space-y-1 text-sm">
          <span>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isLoading ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        type="button"
        onClick={onSignOut}
        disabled={isLoading}
        className="rounded border border-zinc-300 px-4 py-2 text-sm"
      >
        Sign out
      </button>

      {status ? (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">{status}</p>
      ) : null}

      <Link href="/" className="text-sm text-zinc-600 underline">
        Back home
      </Link>
    </main>
  );
}
