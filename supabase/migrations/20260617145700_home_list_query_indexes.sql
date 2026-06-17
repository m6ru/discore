-- Home hub: participant lookup, pending invites, round status filters.
create index if not exists round_participants_user_id_idx
  on public.round_participants (user_id)
  where user_id is not null;

create index if not exists round_invitations_invited_pending_idx
  on public.round_invitations (invited_user_id)
  where status = 'pending';

create index if not exists rounds_status_idx
  on public.rounds (status);
