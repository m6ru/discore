import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
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
        .select("first_name, last_name, gender, birth_year, city, avatar_url")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{user ? "Account" : "Sign in"}</h1>
        <p className="text-sm text-zinc-600">{user ? "Manage your profile and session." : "Sign in or create an account."}</p>
      </header>

      {user ? (
        <AccountPanel
          email={user.email ?? ""}
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

      <Link href="/" className="text-sm text-zinc-600 underline">
        Back home
      </Link>
    </main>
  );
}
