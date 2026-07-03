import type { InviteRow } from "@/lib/rounds/invite-rows";
import type { RoundStatus } from "@/lib/rounds/round-status";

export type { RoundStatus };
export type { LeaderboardEntry as LeaderboardRow } from "@/lib/scoring/leaderboard";
export type { HoleProgressEntry } from "@/lib/scoring/progress";

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
  distance_m: number;
  notes: string | null;
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
  roundName: string | null;
  startingHole: number;
  roundStatus: RoundStatus;
  scorerUserId: string;
  isScorer: boolean;
  currentUserId: string;
  scorerDisplayName: string;
  courseName: string;
  courseSlug: string | null;
  layoutName: string;
  layoutTotalPar: number;
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
