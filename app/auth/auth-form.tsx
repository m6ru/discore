"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { claimLocalTrialIfNeeded } from "@/lib/local-round";
import { toastError, toastSuccess } from "@/lib/ui/toast-notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pagePrimaryButtonClassName, pageTitleClassName } from "@/lib/ui/page-chrome";
import { cn } from "@/lib/utils";

type AuthMode = "sign-in" | "sign-up";

type Props = {
  message: string | null;
  /** `/auth?mode=sign-up` opens on Create an account (the trial save box links there). */
  initialMode?: AuthMode;
};

export function AuthForm({ message, initialMode = "sign-in" }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toastError(error.message);
          return;
        }
        const claim = await claimLocalTrialIfNeeded(supabase);
        if (!claim.ok) {
          toastError(claim.message);
        } else if (claim.outcome === "claimed") {
          toastSuccess("Your trial round was saved to history.");
        }
        router.push("/");
        router.refresh();
        return;
      }

      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      if (!trimmedFirst || !trimmedLast) {
        toastError("First name and last name are required.");
        return;
      }

      // First/last name are passed as user metadata. The `handle_new_user`
      // trigger composes `profiles.display_name` from them so we never store
      // email on the profile (BLUEPRINT §5/§7).
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: trimmedFirst,
            last_name: trimmedLast,
          },
        },
      });
      if (error) {
        toastError(error.message);
        return;
      }
      if (data.session) {
        const claim = await claimLocalTrialIfNeeded(supabase);
        if (!claim.ok) {
          toastError(claim.message);
        } else if (claim.outcome === "claimed") {
          toastSuccess("Your trial round was saved to history.");
        }
        router.push("/");
        router.refresh();
        return;
      }
      toastSuccess("Sign-up successful. Check your email for confirmation.");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleMode() {
    setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
  }

  const isSignIn = mode === "sign-in";

  return (
    <>
      <header className="space-y-1.5">
        <h1 className={pageTitleClassName}>{isSignIn ? "Sign in" : "Create an account"}</h1>
        <p className="text-[15px] text-muted-foreground">
          Save your rounds, see your stats, play with friends.
        </p>
      </header>

      {message ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{message}</p>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-3.5">
        {!isSignIn ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                type="text"
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                maxLength={80}
                autoComplete="given-name"
                className={fieldClassName}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                type="text"
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                maxLength={80}
                autoComplete="family-name"
                className={fieldClassName}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className={fieldClassName}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={isSignIn ? "current-password" : "new-password"}
            className={fieldClassName}
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className={cn(pagePrimaryButtonClassName, "mt-1.5 min-h-[52px] justify-between px-[18px] text-base")}
        >
          {isLoading ? "Please wait..." : isSignIn ? "Sign in" : "Create account"}
          <ArrowRight className="size-5" aria-hidden />
        </Button>
      </form>

      <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={toggleMode}
        className={cn(pagePrimaryButtonClassName, "min-h-[52px] border-foreground text-base")}
      >
        {isSignIn ? "Create an account" : "I already have an account"}
      </Button>
    </>
  );
}

const fieldClassName = "h-12 bg-card text-base";
