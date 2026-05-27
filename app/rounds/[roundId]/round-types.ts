import type { InviteRow } from "@/lib/rounds/invite-rows";

export type RoundStatus = "draft" | "active" | "completed" | "abandoned" | string;

export type ParticipantRow = {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  joined_at: string;
};

export type ProfileSearchResult = {
  id: string;
  display_name: string;
};

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

export type HoleRow = {
  id: string;
  hole_number: number;
  par: number;
};

export type HoleScoreRow = {
  id: string;
  participant_id: string;
  hole_id: string;
  strokes: number;
  ob: boolean;
  fairway_hit: boolean | null;
};

export type RoundSessionProps = {
  roundId: string;
  roundStatus: RoundStatus;
  scorerUserId: string;
  isScorer: boolean;
  currentUserId: string;
  scorerDisplayName: string;
  initialParticipants: ParticipantRow[];
  initialInvites: InviteRow[];
  holes: HoleRow[];
  initialHoleScores: HoleScoreRow[];
};

export type LastSavedEvent = {
  holeId: string;
  participantId: string;
  savedAt: number;
};

export type LeaderboardRow = {
  participantId: string;
  label: string;
  totalStrokes: number;
  vsPar: number;
  thru: number;
};
