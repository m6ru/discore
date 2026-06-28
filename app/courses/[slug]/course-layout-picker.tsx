"use client";

import { useState } from "react";
import Link from "next/link";
import { StartRoundButton } from "@/components/rounds/start-round-button";
import { cn } from "@/lib/utils";

export type CourseLayoutOption = {
  id: string;
  name: string;
  totalPar: number;
  totalDistanceM: number;
  mapUrl: string | null;
};

type Props = {
  layouts: CourseLayoutOption[];
};

const tabBaseClassName =
  "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors";

const tabActiveClassName = "border-primary text-foreground";
const tabInactiveClassName =
  "border-transparent text-muted-foreground hover:text-foreground";

function LayoutDetailPanel({ layout }: { layout: CourseLayoutOption }) {
  return (
    <div className="space-y-4 p-4 pt-3">
      <p className="font-mono text-sm tabular-nums text-muted-foreground">
        Par {layout.totalPar} · {layout.totalDistanceM.toLocaleString()} m
      </p>
      {layout.mapUrl ? (
        <Link
          href={layout.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-primary underline underline-offset-4"
        >
          Layout map
        </Link>
      ) : null}
      <StartRoundButton
        layoutId={layout.id}
        className="w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto"
      />
    </div>
  );
}

export function CourseLayoutPicker({ layouts }: Props) {
  const [selectedId, setSelectedId] = useState(layouts[0]?.id ?? "");
  const selected =
    layouts.find((layout) => layout.id === selectedId) ?? layouts[0] ?? null;

  if (!selected) {
    return null;
  }

  const singleLayout = layouts.length === 1;

  return (
    <div className="rounded-lg border">
      <div
        className={cn(
          "flex gap-1 overflow-x-auto border-b border-border px-1",
          singleLayout && "px-4"
        )}
        role={singleLayout ? undefined : "tablist"}
        aria-label={singleLayout ? undefined : "Course layouts"}
      >
        {singleLayout ? (
          <p
            className={cn(tabBaseClassName, tabActiveClassName, "cursor-default")}
          >
            {layouts[0].name}
          </p>
        ) : (
          layouts.map((layout) => {
            const active = layout.id === selected.id;
            return (
              <button
                key={layout.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={cn(
                  tabBaseClassName,
                  active ? tabActiveClassName : tabInactiveClassName
                )}
                onClick={() => setSelectedId(layout.id)}
              >
                {layout.name}
              </button>
            );
          })
        )}
      </div>
      <div role={singleLayout ? undefined : "tabpanel"}>
        <LayoutDetailPanel layout={selected} />
      </div>
    </div>
  );
}
