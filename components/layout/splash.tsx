/**
 * The wordmark with a par / birdie / ace row, shown on a device's first open
 * only. The script runs before the first paint: a device that has seen it
 * gets `data-splash="seen"` on <html> and the CSS hides the splash, so a
 * returning player never sees a flash. Animation and timing live in
 * globals.css (gone in under a second, never blocks taps).
 */
const SEEN_KEY = "discore-splash-seen";

const rememberScript = `try{if(localStorage.getItem("${SEEN_KEY}")){document.documentElement.dataset.splash="seen"}else{localStorage.setItem("${SEEN_KEY}","1")}}catch(e){document.documentElement.dataset.splash="seen"}`;

export function Splash() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: rememberScript }} />
      <div aria-hidden className="splash">
        <span className="font-display text-[60px] font-bold leading-none tracking-[-0.03em]">
          discore
        </span>
        <span className="mt-[22px] flex gap-2">
          <span className="splash-cell bg-primary-foreground" />
          <span className="splash-cell bg-good" />
          <span className="splash-cell bg-ace" />
        </span>
      </div>
    </>
  );
}
