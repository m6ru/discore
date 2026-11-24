import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Handles PKCE code-exchange redirects. New confirmation emails link to
 * /auth/confirm instead (works in any browser); this stays for links already sent.
 * Add this URL to Auth → Redirect URLs in the Supabase dashboard, e.g.
 * https://<your-app>/auth/callback and http://localhost:3000/auth/callback
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth?message=${encodeURIComponent("Email confirmation link was invalid or expired.")}`
    );
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Usually the link was opened in another browser than the sign-up (no PKCE
    // verifier there); the email is confirmed anyway, so signing in works.
    return NextResponse.redirect(
      `${origin}/auth?message=${encodeURIComponent(
        "Couldn't sign you in from this link. If you just confirmed your email, sign in below."
      )}`
    );
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";

  if (isLocal) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

function sanitizeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}
