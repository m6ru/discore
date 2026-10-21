"use client";

import { useMemo, useState } from "react";
import { CircleCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { HomeSuggestionThanks } from "@/lib/home/types";
import { homeRowMetaClassName } from "@/lib/ui/page-chrome";

type Props = {
  items: HomeSuggestionThanks[];
};

/** "Your fix is live" cards for applied course suggestions; dismissing marks them seen. */
export function SuggestionThanks({ items }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = items.filter((item) => !dismissed.includes(item.id));

  if (visible.length === 0) {
    return null;
  }

  function dismiss(id: string) {
    setDismissed((prev) => [...prev, id]);
    // Supabase queries are lazy: nothing is sent until the result is awaited or
    // .then()'d. If it fails, the card simply shows again next time.
    void supabase
      .from("course_suggestions")
      .update({ thanked_seen_at: new Date().toISOString() })
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.warn("Dismissing the suggestion thank-you failed", error);
        }
      });
  }

  return (
    <section className="space-y-2" aria-label="Your course suggestions">
      {visible.map((item) => {
        const where = [item.courseName, item.layoutName].filter(Boolean).join(" · ");
        return (
          <div key={item.id} className="flex items-start gap-3 rounded-lg bg-primary/10 px-4 py-3 text-sm">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="font-medium">
                Your suggestion{where ? ` for ${where}` : ""} is in the app — thanks for helping!
              </p>
              {item.ownerNote ? <p className={homeRowMetaClassName}>{item.ownerNote}</p> : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(item.id)}
              className="-m-1 rounded-md p-1 text-muted-foreground hover:bg-background/60"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </section>
  );
}
