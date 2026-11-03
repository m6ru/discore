// Row shapes shared by the round screen (app/rounds/[roundId]) and lib/rounds helpers.

import { pickOne } from "@/lib/supabase/select-helpers";

export type ParticipantRow = {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  joined_at: string;
  /** Registered player's name (from `profiles`); guests and the trial have none. */
  display_name?: string | null;
};

/** Select for `round_participants`, names included (any signed-in user can read profiles). */
export const PARTICIPANT_SELECT = "id, user_id, guest_name, joined_at, profiles(display_name)";

type RawParticipantRow = Omit<ParticipantRow, "display_name"> & {
  profiles?: { display_name: string | null } | { display_name: string | null }[] | null;
};

export function normalizeParticipantRows(raw: RawParticipantRow[] | null | undefined): ParticipantRow[] {
  return (raw ?? []).map(({ profiles, ...row }) => ({
    ...row,
    display_name: pickOne(profiles)?.display_name ?? null,
  }));
}

export type UnifiedPlayer = {
  key: string;
  label: string;
  isPending: boolean;
  canRemove: boolean;
  source: "participant" | "invite";
  participantId?: string;
  invitedUserId?: string;
  inviteId?: string;
};

export type HoleScoreRow = {
  id: string;
  participant_id: string;
  hole_id: string;
  strokes: number;
  ob: boolean;
  fairway_hit: boolean | null;
};
