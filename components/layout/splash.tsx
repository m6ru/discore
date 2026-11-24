/**
 * The wordmark with a par / birdie / ace row, shown on a device's first open
 * only. The script runs before the first paint: a device that has seen it
 * gets `data-splash="seen"` on <html> and the CSS hides the splash, so a
 * returning player never sees a flash. Animation and timing live in
 * globals.css (about 1.8 s, never blocks taps).
 */
const SEEN_KEY = "discore-splash-seen";

const rememberScript = `try{if(localStorage.getItem("${SEEN_KEY}")){document.documentElement.dataset.splash="seen"}else{localStorage.setItem("${SEEN_KEY}","1")}}catch(e){document.documentElement.dataset.splash="seen"}`;

export function Splash() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: rememberScript }} />
      <div aria-hidden className="splash">
        <span className="font-display text-[60px] font-bold leading-none tracking-[-0.03em]">
          discbook
        </span>
        {/* Scorecard cells, scaled up: par 3, birdie 2, ace 1. */}
        <span className="mt-6 flex gap-1.5 font-mono text-xl font-semibold text-foreground">
          <span className="splash-cell bg-primary-foreground">3</span>
          <span className="splash-cell bg-good">2</span>
          <span className="splash-cell bg-ace">1</span>
        </span>
      </div>
    </>
  );
}
