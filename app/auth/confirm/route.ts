import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";

/**
 * The link in the "Confirm signup" email (supabase/templates/confirmation.html).
 * It carries a one-time token hash instead of a PKCE code, so it works in any
 * browser: the home-screen app, a mail app's own browser, another device.
 * Home then claims a waiting trial round (ClaimTrialOnAuth).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(
    `${origin}/auth?message=${encodeURIComponent(
      "This link has expired or was already used. If you confirmed your email, sign in below."
    )}`
  );
}
