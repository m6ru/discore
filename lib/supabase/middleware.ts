import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshes the session when the token is expired (rotating the cookies via
  // setAll above) and verifies the JWT locally against the cached JWKS — no Auth
  // round-trip per navigation while the project uses asymmetric signing keys
  // (falls back to a network getUser() only for symmetric keys). Only
  // middleware touches auth; pages read claims via getClaims (BLUEPRINT §2b).
  const authStartedMs = performance.now()
  await supabase.auth.getClaims()
  supabaseResponse.headers.set(
    'Server-Timing',
    `auth;dur=${(performance.now() - authStartedMs).toFixed(1)}`,
  )

  return supabaseResponse
}
