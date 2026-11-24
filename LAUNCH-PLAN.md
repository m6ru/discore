# Launch plan — own domain, real emails, ready for the public

Written 2026-11-24 with the owner. Work through it top to bottom; tick boxes in a PR as steps get done. **Never paste a password or API key into this file, a commit, a PR or a chat** — keys go only into the dashboard field that asks for them.

Who does what: **Owner** = clicks in a dashboard or pays. **Claude** = code in a PR. **Together** = the owner clicks while Claude guides live.

## Why

- Supabase's built-in email is for testing: **2 emails per hour** for the whole app, sender "Supabase Auth", a "powered by Supabase" footer, and the email templates can't be edited until a custom SMTP sender is set.
- The new confirm link (`/auth/confirm`, PR #81) works in any browser, but only once the new template is pasted, which needs custom SMTP, which needs our own domain.
- Before strangers use the app: they must be able to reset a password, read what we store, and delete their account (GDPR).

## 1. Domain — Owner

- [ ] Buy **`discbook.ee`** (the app is renamed from discore: an old disc golf scorecard app in Estonia already used that name; owner chose discbook on 2026-11-24, `.ee` and `.app` looked free). First search the name in the Estonian Patent Office trademark database (Patendiamet → Kaubamärgid), 5 minutes. `.ee` is sold by Estonian registrars (e.g. zone.ee, veebimajutus.ee); about €10–20 a year. Compare the **renewal** price, not just the first year. Pick one with a simple DNS page.
- [ ] Turn on auto-renew so the domain can't lapse.

## 2. Point the domain at the app — Together (~30 min)

- [ ] Vercel → project → **Settings → Domains** → add `discbook.ee` and `www.discbook.ee`. Vercel shows the exact DNS records; add them at the registrar. HTTPS is automatic.
- [ ] Make `discbook.ee` the main address and let `www` redirect to it. The old `discore-eta.vercel.app` keeps working.
- [ ] Supabase → **Authentication → URL Configuration**:
  - **Site URL** → `https://discbook.ee` (email links are built from it).
  - **Redirect URLs** → add `https://discbook.ee/**`; keep the existing entries (previews, localhost).
- [ ] Open `https://discbook.ee` on the phone: sign in, start and discard a trial.
- [ ] Send yourself a link to `https://discbook.ee` in a chat: the preview card shows the share image and the description (chats cache previews; a link shared before can keep the old one).
- [ ] Telegram ping: the link in the suggestion message is written into the database function (`discore-eta.vercel.app/admin/suggestions`). It keeps working; a small migration (Claude) points it at `discbook.ee`.
- [ ] Home-screen icon: remove it and add it again from `discbook.ee` (it is tied to the old address; signing in once more is expected).

## 3. Email service (Resend) — Together (~30 min + DNS wait)

Resend free tier: 100 emails a day, 3,000 a month — plenty for sign-ups and password resets.

- [ ] Create an account at resend.com.
- [ ] **Domains → Add domain** → `discbook.ee`, region **EU (Ireland)** (keeps data in the EU).
- [ ] Copy the DNS records Resend shows (DKIM, SPF, MX on a `send` subdomain) to the registrar's DNS page. Also add a DMARC record if Resend suggests one (`_dmarc`, `v=DMARC1; p=none;`) — it helps emails land in the inbox, not spam.
- [ ] Wait until Resend says **Verified** (minutes to a few hours).
- [ ] **API Keys → Create** → name `supabase-smtp`, permission **Sending access**, domain `discbook.ee`. Copy it once, straight into the next step.

## 4. Custom SMTP in Supabase — Owner, Claude guides

Supabase → **Authentication → Emails → SMTP Settings** → Enable custom SMTP:

| Field | Value |
|---|---|
| Sender email | `noreply@discbook.ee` |
| Sender name | `discbook` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | the Resend API key from step 3 |

- [ ] Save. (Never save with empty fields: sign-up emails would stop.)

## 5. Email templates — Owner

Supabase → **Authentication → Emails → Templates**:

- [ ] **Confirm signup** — subject `Confirm your discbook account`, body = the whole of [`supabase/templates/confirmation.html`](supabase/templates/confirmation.html).
- [ ] **Reset password** — subject `Reset your discbook password`, body = the whole of [`supabase/templates/recovery.html`](supabase/templates/recovery.html).

## 6. Rate limits — Owner

Supabase → **Authentication → Rate Limits**:

- [ ] **Rate limit for sending emails** → `100` per hour (it becomes 30 when SMTP is enabled).
- Leave the rest as they are (checked 2026-11-24: sign-ups/sign-ins and token verifications 30 per 5 min per IP, refreshes 150, 60 s between emails to one person — all fine). IP address forwarding stays off.

## 7. Test as a new player — Owner

- [ ] On the phone, in the **home-screen app**, create an account with an address never used before.
- [ ] The email comes from **discbook <noreply@discbook.ee>**, has no Supabase footer, and is not in spam.
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
