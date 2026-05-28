-- BLUEPRINT §5/§7: profiles must never contain email. The signup flow now
-- collects first/last name and forwards them via `options.data` on
-- `supabase.auth.signUp(...)`, which lands in `auth.users.raw_user_meta_data`.
-- Rebuild `handle_new_user` to read those fields and reject signups that omit
-- them. The fallback below is intentionally non-PII so even bypassed flows
-- (e.g. dashboard-created users) cannot leak an email through `display_name`.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  first_name_input text := nullif(trim(meta ->> 'first_name'), '');
  last_name_input  text := nullif(trim(meta ->> 'last_name'),  '');
  composed_display_name text;
begin
  if first_name_input is null or last_name_input is null then
    -- Non-PII fallback. Will be replaced once the user saves their profile.
    composed_display_name := 'Player ' || substring(new.id::text, 1, 8);
  else
    composed_display_name := first_name_input || ' ' || last_name_input;
  end if;

  insert into public.profiles (id, first_name, last_name, display_name)
  values (new.id, first_name_input, last_name_input, composed_display_name);

  return new;
end;
$$;

-- Backfill: any historical row whose display_name is literally the user's
-- email is replaced with the non-PII placeholder. The user can then set their
-- real name from the account screen.
update public.profiles p
set display_name = 'Player ' || substring(p.id::text, 1, 8)
from auth.users u
where p.id = u.id
  and p.display_name = u.email;
