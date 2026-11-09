import type { Metadata } from "next";
import { ChevronRight, Info, Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// Hidden reference page for direction C: not linked anywhere, not indexed.
// The rules live in DESIGN-PATTERNS.md → Redesign brief; this page shows them.
export const metadata: Metadata = {
  title: "Design · Discore",
  robots: { index: false, follow: false },
};

const colors = [
  { name: "background", hex: "#FAFAF6", className: "bg-background" },
  { name: "foreground", hex: "#141814", className: "bg-foreground" },
  { name: "muted-foreground", hex: "#5B615B", className: "bg-muted-foreground" },
  { name: "primary (forest)", hex: "#1D3A2C", className: "bg-primary" },
  { name: "muted (frame tint)", hex: "#F2F1EA", className: "bg-muted" },
  { name: "accent (hover)", hex: "#EDECE5", className: "bg-accent" },
  { name: "border", hex: "#E4E3DC", className: "bg-border" },
  { name: "input", hex: "#D4D3CB", className: "bg-input" },
  { name: "good (lime)", hex: "#C9E36A", className: "bg-good" },
  { name: "over", hex: "#E9D9C9", className: "bg-over" },
  { name: "over-strong", hex: "#D4B496", className: "bg-over-strong" },
  { name: "eagle", hex: "#6FA6D9", className: "bg-eagle" },
  { name: "ace", hex: "#FFE566", className: "bg-ace" },
  { name: "destructive", hex: "#A8261B", className: "bg-destructive" },
];

const scoreTones = [
  { label: "Ace", score: 1, className: "bg-ace" },
  { label: "Eagle", score: 2, className: "bg-eagle" },
  { label: "Birdie", score: 3, className: "bg-good" },
  { label: "Par", score: 4, className: "" },
  { label: "Bogey", score: 5, className: "bg-over" },
  { label: "Double or worse", score: 6, className: "bg-over-strong" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t pt-5">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-5 sm:p-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Direction C · Scorecard</h1>
        <p className="text-sm text-muted-foreground">
          Tokens and building blocks. Rules: DESIGN-PATTERNS.md → Redesign brief.
        </p>
      </header>

      <Section title="Colours">
        <ul className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
          {colors.map((color) => (
            <li key={color.name} className="flex min-h-12 items-center gap-3 border-b py-2">
              <span className={cn("size-8 shrink-0 rounded-md border", color.className)} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{color.name}</span>
                <span className="block font-mono text-xs text-muted-foreground">{color.hex}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Type">
        <div className="space-y-3">
          <p className="font-display text-5xl font-semibold leading-none tracking-tight">5</p>
          <p className="font-display text-3xl font-semibold tracking-tight">Haanja discgolfipark</p>
          <p className="font-display text-lg font-semibold">Section heading</p>
          <p className="text-base">Body text in Manrope. Readable in sunlight, quiet otherwise.</p>
          <p className="text-sm text-muted-foreground">Muted meta line · 18 holes · par 57</p>
          <p className="font-mono text-sm font-semibold tabular-nums">55 · +1 · −2 · E</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-col gap-2">
          <Button size="lg" className="min-h-13 justify-between px-5 text-base font-semibold">
            Start a round <ChevronRight aria-hidden />
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button
              variant="outline"
              className="border-destructive/30 font-semibold text-destructive hover:bg-destructive/5 hover:text-destructive"
            >
              Abandon round
            </Button>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_100px_minmax(0,1fr)] items-center gap-2">
            <Button variant="outline" aria-label="Decrease strokes" className="h-18 border-[1.5px] border-foreground">
              <Minus className="size-7" aria-hidden />
            </Button>
            <span className="text-center font-display text-5xl font-semibold leading-none">4</span>
            <Button
              variant="outline"
              aria-label="Increase strokes"
              className="h-18 border-[1.5px] border-foreground bg-accent"
            >
              <Plus className="size-7" aria-hidden />
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Rows, frame, chips">
        <div className="space-y-4">
          <ul>
            {["Tartu Tähtvere", "Haanja", "Viimsi"].map((name, index) => (
              <li key={name} className="flex min-h-12 items-center gap-3 border-b">
                <span className="w-11 font-mono text-sm text-muted-foreground">{`${19 - index * 7}.10`}</span>
                <span className="flex-1 text-[15px] font-semibold">{name}</span>
                <span className="font-mono font-semibold">{index === 1 ? "−1" : "+4"}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 rounded-lg border bg-muted p-4">
            <p className="text-sm font-semibold text-muted-foreground">Framed section</p>
            <p className="font-display text-2xl font-semibold tracking-tight">Haanja discgolfipark</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-good font-bold text-good-foreground">New best</Badge>
            <Badge variant="outline">Outline chip</Badge>
            <Badge variant="secondary">Secondary chip</Badge>
          </div>
          <label className="flex min-h-14 items-center gap-3 border-y">
            <span className="flex-1">
              <span className="block font-semibold">Clean card</span>
              <span className="block text-sm text-muted-foreground">Only this hole&apos;s strokes show</span>
            </span>
            <Switch />
          </label>
          <p className="flex items-start gap-2 text-sm text-foreground/85">
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            OB left of the gravel path. Mando: pass right of the big pine.
          </p>
        </div>
      </Section>

      <Section title="Score tones and progress">
        <div className="space-y-4">
          <ul className="flex flex-wrap gap-4">
            {scoreTones.map((tone) => (
              <li key={tone.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span
                  className={cn(
                    "flex h-[30px] w-5 items-center justify-center rounded-[3px] font-mono text-xs font-semibold text-foreground",
                    tone.className
                  )}
                >
                  {tone.score}
                </span>
                {tone.label}
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-mono font-semibold text-foreground">4</span> of{" "}
              <span className="font-mono font-semibold text-foreground">18</span> played
            </p>
            <div className="grid grid-cols-[repeat(18,minmax(0,1fr))] gap-0.5" aria-hidden>
              {Array.from({ length: 18 }, (_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-1 rounded-[1px]",
                    index < 4 ? "bg-primary" : index === 4 ? "bg-primary/50" : "bg-border"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
