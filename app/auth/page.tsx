import { createServerClient } from "@/lib/supabase/server";
import { AccountPanel } from "./account-panel";
import { AuthForm } from "./auth-form";
import Link from "next/link";

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
        .select("first_name, last_name, gender, birth_year, city, avatar_url")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{user ? "Account" : "Sign in"}</h1>
        <p className="text-sm text-muted-foreground">
          {user
            ? "Your profile and settings. Round history and stats will live here later."
            : "Sign in or create an account."}
        </p>
      </header>

      {user ? (
        <>
          <AccountPanel
            email={user.email ?? ""}
            initialFirstName={profile?.first_name ?? ""}
            initialLastName={profile?.last_name ?? ""}
            initialGender={profile?.gender ?? ""}
            initialBirthYear={profile?.birth_year ? String(profile.birth_year) : ""}
            initialCity={profile?.city ?? ""}
            initialAvatarUrl={profile?.avatar_url ?? ""}
          />
          <Link
            href="/rounds"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            View round history
          </Link>
        </>
      ) : (
        <AuthForm message={message ?? null} />
      )}
    </main>
  );
}
