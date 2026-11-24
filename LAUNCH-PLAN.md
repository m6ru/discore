# Launch plan — own domain, real emails, ready for the public

Written 2026-11-24 with the owner. Work through it top to bottom; tick boxes in a PR as steps get done. **Never paste a password or API key into this file, a commit, a PR or a chat** — keys go only into the dashboard field that asks for them.

Who does what: **Owner** = clicks in a dashboard or pays. **Claude** = code in a PR. **Together** = the owner clicks while Claude guides live.

## Why

- Supabase's built-in email is for testing: **2 emails per hour** for the whole app, sender "Supabase Auth", a "powered by Supabase" footer, and the email templates can't be edited until a custom SMTP sender is set.
- The new confirm link (`/auth/confirm`, PR #81) works in any browser, but only once the new template is pasted, which needs custom SMTP, which needs our own domain.
- Before strangers use the app: they must be able to reset a password, read what we store, and delete their account (GDPR).

## 1. Domain — Owner

- [ ] Buy **`discore.ee`** (looked free on 2026-11-24). `.ee` is sold by Estonian registrars (e.g. zone.ee, veebimajutus.ee); about €10–20 a year. Compare the **renewal** price, not just the first year. Pick one with a simple DNS page.
- [ ] Turn on auto-renew so the domain can't lapse.

## 2. Point the domain at the app — Together (~30 min)

- [ ] Vercel → project → **Settings → Domains** → add `discore.ee` and `www.discore.ee`. Vercel shows the exact DNS records; add them at the registrar. HTTPS is automatic.
- [ ] Make `discore.ee` the main address and let `www` redirect to it. The old `discore-eta.vercel.app` keeps working.
- [ ] Supabase → **Authentication → URL Configuration**:
  - **Site URL** → `https://discore.ee` (email links are built from it).
  - **Redirect URLs** → add `https://discore.ee/**`; keep the existing entries (previews, localhost).
- [ ] Open `https://discore.ee` on the phone: sign in, start and discard a trial.
- [ ] Home-screen icon: remove it and add it again from `discore.ee` (it is tied to the old address; signing in once more is expected).

## 3. Email service (Resend) — Together (~30 min + DNS wait)

Resend free tier: 100 emails a day, 3,000 a month — plenty for sign-ups and password resets.

- [ ] Create an account at resend.com.
- [ ] **Domains → Add domain** → `discore.ee`, region **EU (Ireland)** (keeps data in the EU).
- [ ] Copy the DNS records Resend shows (DKIM, SPF, MX on a `send` subdomain) to the registrar's DNS page. Also add a DMARC record if Resend suggests one (`_dmarc`, `v=DMARC1; p=none;`) — it helps emails land in the inbox, not spam.
- [ ] Wait until Resend says **Verified** (minutes to a few hours).
- [ ] **API Keys → Create** → name `supabase-smtp`, permission **Sending access**, domain `discore.ee`. Copy it once, straight into the next step.

## 4. Custom SMTP in Supabase — Owner, Claude guides

Supabase → **Authentication → Emails → SMTP Settings** → Enable custom SMTP:

| Field | Value |
|---|---|
| Sender email | `noreply@discore.ee` |
| Sender name | `discore` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | the Resend API key from step 3 |

- [ ] Save. (Never save with empty fields: sign-up emails would stop.)

## 5. Email templates — Owner

Supabase → **Authentication → Emails → Templates**:

- [ ] **Confirm signup** — subject `Confirm your discore account`, body = the whole of [`supabase/templates/confirmation.html`](supabase/templates/confirmation.html).
- [ ] **Reset password** — subject `Reset your discore password`, body = the whole of [`supabase/templates/recovery.html`](supabase/templates/recovery.html).

## 6. Rate limits — Owner

Supabase → **Authentication → Rate Limits**:

- [ ] **Rate limit for sending emails** → `100` per hour (it becomes 30 when SMTP is enabled).
- Leave the rest as they are (checked 2026-11-24: sign-ups/sign-ins and token verifications 30 per 5 min per IP, refreshes 150, 60 s between emails to one person — all fine). IP address forwarding stays off.

## 7. Test as a new player — Owner

- [ ] On the phone, in the **home-screen app**, create an account with an address never used before.
- [ ] The email comes from **discore <noreply@discore.ee>**, has no Supabase footer, and is not in spam.
- [ ] Tap **Confirm email** in the mail app → it opens in a browser and lands on Home, signed in.
- [ ] Tap the same link again → "This link has expired or was already used…".
- [ ] Bonus: play a trial first, then sign up and confirm on the **same** phone → the trial is in History.
- [ ] Sign in → **Forgot password?** → the reset email arrives → **Choose a new password** opens **Set a new password** → sign in with it.

## 8. Code before inviting the public — Claude, one PR each

- [x] **Forgot password** — "Forgot password?" on Sign in → email with a link (token hash, like confirm) → Set a new password. Template for step 5: `supabase/templates/recovery.html`.
- [ ] **Privacy page** — what we store (name, email, city, birth year, gender, photo, scores; location only on the phone, never stored), why, who sees what, how to get it deleted. Linked from Sign in and Profile.
- [ ] **Delete account** — in Profile, with a confirmation. Needs a database function (rounds and scores the player kept for others: decide together what happens to them).
- [ ] Other auth templates if used later (change email, magic link): same look, token-hash links.

## 9. Costs and safety

| What | Cost now | When it changes |
|---|---|---|
| Domain | ~€10–20 / year | — |
| Vercel Hobby | free | Ads or payments → Pro (~$20 / month) |
| Supabase Free | free | Needs backups or > 500 MB → Pro (~$25 / month) |
| Resend Free | free | > 100 emails a day |

- [ ] Decide on backups: Supabase Free has **none**. Either Pro (daily backups) or a manual export now and then (Claude can write a script the owner runs).

## Done when

Every box above is ticked; STATUS → Handoff then says the app is open to the public and this file can be deleted (git keeps it).
