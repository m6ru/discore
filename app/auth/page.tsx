import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { buildDisplayName } from "@/lib/profiles/format-display-name";
import {
  homeRowLinkClassName,
  pageSubtitleClassName,
  pageTitleClassName,
} from "@/lib/ui/page-chrome";
import { AccountPanel } from "./account-panel";
import { AuthForm } from "./auth-form";

type AuthPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const { message } = await searchParams;
  const supabase = await createServerClient();
  // getClaims() verifies the JWT locally when possible; proxy.ts handles refresh.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims ?? null;

  const { data: profile } = claims
    ? await supabase
        .from("profiles")
        .select("first_name, last_name, display_name, gender, birth_year, city, avatar_url")
        .eq("id", claims.sub)
        .maybeSingle()
    : { data: null };

  // Owner-only: link to the course-suggestion review with the number waiting.
  const { data: isAdmin } = claims ? await supabase.rpc("is_app_admin") : { data: false };
  const { count: newSuggestions } = isAdmin
    ? await supabase
        .from("course_suggestions")
        .select("id", { count: "exact", head: true })
        .eq("status", "new")
    : { count: null };

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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <header className="space-y-1">
        <h1 className={pageTitleClassName}>{claims ? "Profile" : "Sign in"}</h1>
        <p className={pageSubtitleClassName}>
          {claims ? "Your account and preferences." : "Sign in or create an account."}
        </p>
      </header>

      {isAdmin ? (
        <Link href="/admin/suggestions" className={homeRowLinkClassName}>
          <span className="font-medium">Course suggestions</span>
          <span className="flex items-center gap-2 text-muted-foreground">
            {newSuggestions ? (
              <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-xs tabular-nums text-primary-foreground">
                {newSuggestions} new
              </span>
            ) : null}
            <ChevronRight className="size-4" aria-hidden />
          </span>
        </Link>
      ) : null}

      {claims ? (
        <AccountPanel
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
        <AuthForm message={message ?? null} />
      )}
    </main>
  );
}
