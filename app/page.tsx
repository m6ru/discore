import Link from "next/link";
import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase/server";
import { getAuthUserFirstName } from "@/lib/auth/get-auth-user-first-name";
import { getHomePersonalSubtitle } from "@/lib/ui/home-greeting";
import { pageSubtitleClassName, pageTitleClassName } from "@/lib/ui/page-chrome";
import { HomeSections } from "@/components/home/sections";
import { HomeSectionsSkeleton } from "@/components/home/sections-skeleton";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const supabase = await createServerClient();
  // getClaims() verifies the JWT locally (no Auth round-trip) when the project
  // uses asymmetric signing keys; the session is already refreshed in middleware.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <header className="space-y-1">
        <h1 className={pageTitleClassName}>Discore</h1>
        <p className={pageSubtitleClassName}>
          {claims
            ? getHomePersonalSubtitle(getAuthUserFirstName(claims))
            : "Sign in to save rounds and play with friends."}
        </p>
      </header>

      {!claims ? (
        <Button asChild size="lg" className="min-h-11 w-full sm:w-auto">
          <Link href="/auth">Sign in</Link>
        </Button>
      ) : (
        <Suspense fallback={<HomeSectionsSkeleton />}>
          <HomeSections userId={claims.sub} />
        </Suspense>
      )}
    </main>
  );
}
