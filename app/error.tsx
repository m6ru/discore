"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { pagePrimaryButtonClassName, pageTitleClassName } from "@/lib/ui/page-chrome";

/** Any page that throws lands here; the tab bar from the root layout stays. */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-2 pb-4 sm:p-8">
      <div className="space-y-1.5 pt-3">
        <h1 className={pageTitleClassName}>Something went wrong</h1>
        <p className="text-[15px] text-muted-foreground">
          This page didn&apos;t load. Try again, or go back to Home.
        </p>
      </div>
      <div className="space-y-3">
        <Button type="button" className={pagePrimaryButtonClassName} onClick={() => retry()}>
          Try again
        </Button>
        <Button
          asChild
          variant="outline"
          className="min-h-12 w-full border-[1.5px] border-primary text-[15px] font-semibold text-primary"
        >
          <Link href="/">Home</Link>
        </Button>
      </div>
    </main>
  );
}
