const STEPS = [
  { title: "Pick a course", text: "Choose a layout and add the players." },
  { title: "Score your round", text: "One person keeps the score. Everyone else can observe live." },
  { title: "See your progress", text: "All your rounds in one place, with stats on how you play." },
];

/** The three steps on the landing page, and on Home until the first finished round. */
export function HowItWorks({ headingClassName }: { headingClassName: string }) {
  return (
    <section className="space-y-2">
      <h2 className={headingClassName}>How it works</h2>
      <ol>
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-2 border-b py-4 last:border-b-0">
            <span className="w-6 shrink-0 pt-0.5 font-mono text-[13px] text-muted-foreground">
              {index + 1}
            </span>
            <div className="space-y-1">
              <h3 className="text-base font-bold">{step.title}</h3>
              <p className="text-[15px] leading-normal text-muted-foreground">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
