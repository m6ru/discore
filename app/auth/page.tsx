import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { buildDisplayName } from "@/lib/profiles/format-display-name";
import { pageTitleClassName } from "@/lib/ui/page-chrome";
import { AccountPanel, type AccountView } from "./account-panel";
import { AuthForm } from "./auth-form";

type AuthPageProps = {
  searchParams: Promise<{ message?: string; view?: string; mode?: string }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const { message, view: viewParam, mode } = await searchParams;
  const view: AccountView =
    viewParam === "edit" || viewParam === "password" ? viewParam : "menu";
  const supabase = await createServerClient();
  // getClaims() verifies the JWT locally when possible; proxy.ts handles refresh.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims ?? null;

  // One wave. Owner-only: a link to the course-suggestion review with the
  // number waiting. A non-admin's count is their own new suggestions (RLS),
  // so it is only used when the admin check says yes.
  const [{ data: profile }, { data: isAdmin }, { count: suggestionCount }] = claims
    ? await Promise.all([
        supabase
          .from("profiles")
          .select("first_name, last_name, display_name, gender, birth_year, city, avatar_url")
          .eq("id", claims.sub)
          .maybeSingle(),
        supabase.rpc("is_app_admin"),
        supabase
          .from("course_suggestions")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
      ])
    : [{ data: null }, { data: false }, { count: null }];
  const newSuggestions = isAdmin ? suggestionCount : null;

  const email = claims?.email ?? "";
  const metadataFirstName =
    typeof claims?.user_metadata?.first_name === "string"
      ? claims.user_metadata.first_name.trim()
      : "";
  const metadataLastName =
    typeof claims?.user_metadata?.last_name === "string"
      ? claims.user_metadata.last_name.trim()
      : "";
  const displayName =
    profile?.display_name?.trim() ||
    buildDisplayName(
      profile?.first_name ?? metadataFirstName,
      profile?.last_name ?? metadataLastName,
      email
    );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-2 pb-4 sm:p-8">
      {!claims ? (
        <p className="font-display text-xl font-bold tracking-tight">discore</p>
      ) : view === "menu" ? (
        <h1 className={pageTitleClassName}>Profile</h1>
      ) : (
        <header className="space-y-1">
          <Link
            href="/auth"
            aria-label="Back to profile"
            className="-ml-2 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          <h1 className={pageTitleClassName}>{view === "edit" ? "Edit profile" : "Change password"}</h1>
        </header>
      )}

      {isAdmin && view === "menu" ? (
        <Link
          href="/admin/suggestions"
          className="flex min-h-12 items-center justify-between gap-3 rounded-md border bg-secondary px-4 text-sm"
        >
          <span className="font-semibold">Course suggestions</span>
          <span className="flex items-center gap-2 text-muted-foreground">
            {newSuggestions ? (
              <span className="rounded-sm bg-primary px-2 py-0.5 font-mono text-xs tabular-nums text-primary-foreground">
                {newSuggestions} new
              </span>
            ) : null}
            <ChevronRight className="size-4" aria-hidden />
          </span>
        </Link>
      ) : null}

      {claims ? (
        <AccountPanel
          view={view}
          email={email}
          displayName={displayName}
          initialFirstName={profile?.first_name?.trim() || metadataFirstName}
          initialLastName={profile?.last_name?.trim() || metadataLastName}
          initialGender={profile?.gender ?? ""}
          initialBirthYear={profile?.birth_year ? String(profile.birth_year) : ""}
          initialCity={profile?.city ?? ""}
          initialAvatarUrl={profile?.avatar_url ?? ""}
        />
      ) : (
        <AuthForm message={message ?? null} initialMode={mode === "sign-up" ? "sign-up" : "sign-in"} />
      )}
    </main>
  );
}
