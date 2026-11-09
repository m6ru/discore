import type { Viewport } from "next";
import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase/server";
import { getAuthUserFirstName } from "@/lib/auth/get-auth-user-first-name";
import { ClaimTrialOnAuth } from "@/components/home/claim-trial-on-auth";
import { LandingPage } from "@/components/home/landing";
import { HomeSections } from "@/components/home/sections";
import { HomeSectionsSkeleton } from "@/components/home/sections-skeleton";

/** Home and the landing page start with the forest band, so the status bar matches it. */
export const viewport: Viewport = {
  themeColor: "#1d3a2c",
};

export default async function HomePage() {
  const supabase = await createServerClient();
  // getClaims() verifies the JWT locally (no Auth round-trip) when the project
  // uses asymmetric signing keys; the session is already refreshed in proxy.ts.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  // One address: visitors get the landing page, signed-in players get Home.
  if (!claims) {
    return <LandingPage />;
  }

  const firstName = getAuthUserFirstName(claims);

  return (
    <>
      <div className="bg-primary text-primary-foreground">
        {/* The first Home frame overlaps the band's lower 80 px (-mt-20 below). */}
        <div className="mx-auto w-full max-w-3xl px-4 pb-[108px] sm:px-8">
          <header className="flex min-h-[68px] items-center justify-between gap-3">
            <h1 className="font-display text-xl font-bold tracking-tight">discore</h1>
            <p className="truncate text-[15px] font-semibold text-primary-foreground/80">
              {firstName ? `Tere, ${firstName}` : "Tere!"}
            </p>
          </header>
        </div>
      </div>
      <main className="mx-auto -mt-20 flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-4 sm:px-8 sm:pb-8">
        <ClaimTrialOnAuth />
        <Suspense fallback={<HomeSectionsSkeleton />}>
          <HomeSections userId={claims.sub} />
        </Suspense>
      </main>
    </>
  );
}
