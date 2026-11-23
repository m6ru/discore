"use client"; // Error boundaries must be Client Components

/**
 * Only when the root layout itself fails. It replaces the whole document, so
 * no global styles load here: plain inline styles in the app's colours.
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#fafaf6",
          color: "#141814",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <title>Discore</title>
        <main style={{ maxWidth: 480, margin: "0 auto", padding: "48px 16px" }}>
          <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ fontSize: 15, color: "#5b615b", margin: "0 0 24px" }}>
            Discore didn&apos;t load. Try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              width: "100%",
              minHeight: 48,
              border: 0,
              borderRadius: 6,
              background: "#1d3a2c",
              color: "#fafaf6",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
