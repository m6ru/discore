-- Telegram ping to the owner on each new course suggestion.
-- The database sends it itself (pg_net, async: the request is queued and sent
-- after the insert commits), so a slow or failing Telegram never blocks or
-- fails a suggestion. Bot token and chat id live in Supabase Vault; the owner
-- adds them once in the dashboard SQL editor:
--   select vault.create_secret('<bot token>', 'telegram_bot_token');
--   select vault.create_secret('<chat id>', 'telegram_chat_id');
-- Without both secrets (local, CI) the trigger does nothing.

create extension if not exists pg_net with schema extensions;

create function public.course_suggestions_notify_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  bot_token text;
  chat_id text;
  sender text;
  place text;
  kind_label text;
  photos int;
  message text;
begin
  select decrypted_secret into bot_token from vault.decrypted_secrets where name = 'telegram_bot_token';
  select decrypted_secret into chat_id from vault.decrypted_secrets where name = 'telegram_chat_id';
  if bot_token is null or chat_id is null then
    return null;
  end if;

  select p.display_name into sender from public.profiles p where p.id = new.user_id;

  if new.kind = 'new_course' then
    place := new.course_name || coalesce(' (' || new.location || ')', '');
  else
    select c.name
      || coalesce(' · ' || l.name, '')
      || coalesce(' · hole ' || h.hole_number, '')
      into place
    from public.courses c
    left join public.layouts l on l.id = new.layout_id
    left join public.holes h on h.id = new.hole_id
    where c.id = new.course_id;
  end if;

  -- Same labels as lib/courses/course-suggestions.ts.
  kind_label := case new.kind
    when 'hole_info' then 'Hole par or length'
    when 'layout_changed' then 'Layout changed or re-set'
    when 'new_layout' then 'New layout'
    when 'course_closed' then 'Course closed'
    when 'new_course' then 'New course'
    else 'Something else'
  end;

  photos := cardinality(new.photo_paths);

  message := 'New course suggestion: ' || kind_label || E'\n'
    || coalesce(place, '?') || E'\n'
    || 'From: ' || coalesce(sender, '?') || E'\n\n'
    || left(new.note, 1000)
    || case when photos > 0 then E'\n\n' || photos || ' photo(s)' else '' end
    || E'\n\nhttps://discore-eta.vercel.app/admin/suggestions';

  perform net.http_post(
    url := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
    body := jsonb_build_object('chat_id', chat_id, 'text', message, 'link_preview_options', jsonb_build_object('is_disabled', true))
  );
  return null;
exception when others then
  -- A ping is nice to have; never lose the suggestion over it.
  raise warning 'course suggestion ping failed: %', sqlerrm;
  return null;
end;
$$;

revoke all on function public.course_suggestions_notify_owner() from public, anon, authenticated;

create trigger course_suggestions_notify_owner
  after insert on public.course_suggestions
  for each row execute function public.course_suggestions_notify_owner();
