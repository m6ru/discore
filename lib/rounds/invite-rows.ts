import { pickOne } from "@/lib/supabase/select-helpers";

export type InviteRow = {
  id: string;
  invited_user_id: string;
  status: string;
  created_at: string;
  profiles: {
    display_name: string;
  } | null;
};

type RawInviteProfile =
  | { display_name: string | null }
  | { display_name: string | null }[]
  | null
  | undefined;

type RawInviteRow = {
  id: string;
  invited_user_id: string;
  status: string;
  created_at: string;
  profiles?: RawInviteProfile;
};

/** Normalize Supabase join shape (profiles may be object or array). */
export function normalizeInviteRows(raw: RawInviteRow[] | null | undefined): InviteRow[] {
  return (raw ?? []).map((row) => {
    const profile = pickOne(row.profiles);
    const displayName = profile?.display_name;
    return {
      id: row.id,
      invited_user_id: row.invited_user_id,
      status: row.status,
      created_at: row.created_at,
      profiles:
        typeof displayName === "string" && displayName.length > 0
          ? { display_name: displayName }
          : null,
    };
  });
}
