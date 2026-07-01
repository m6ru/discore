import { createServerClient } from "@/lib/supabase/server";
import { buildDisplayName } from "@/lib/profiles/format-display-name";
import { pageSubtitleClassName, pageTitleClassName } from "@/lib/ui/page-chrome";
import { AccountPanel } from "./account-panel";
import { AuthForm } from "./auth-form";

type AuthPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const { message } = await searchParams;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("first_name, last_name, display_name, gender, birth_year, city, avatar_url")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const email = user?.email ?? "";
  const displayName =
    profile?.display_name?.trim() ||
    buildDisplayName(profile?.first_name ?? "", profile?.last_name ?? "", email);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <header className="space-y-1">
        <h1 className={pageTitleClassName}>{user ? "Profile" : "Sign in"}</h1>
        <p className={pageSubtitleClassName}>
          {user ? "Your account and preferences." : "Sign in or create an account."}
        </p>
      </header>

      {user ? (
        <AccountPanel
          email={email}
          displayName={displayName}
          initialFirstName={profile?.first_name ?? ""}
          initialLastName={profile?.last_name ?? ""}
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
