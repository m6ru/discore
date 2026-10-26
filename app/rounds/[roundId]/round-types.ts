import type { InviteRow } from "@/lib/rounds/invite-rows";
import type { HoleScoreRow, ParticipantRow } from "@/lib/rounds/round-rows";
import type { RoundStatus } from "@/lib/rounds/round-status";

export type { RoundStatus };
export type { HoleScoreRow, ParticipantRow, UnifiedPlayer } from "@/lib/rounds/round-rows";
export type { LeaderboardEntry as LeaderboardRow } from "@/lib/scoring/leaderboard";
export type { HoleProgressEntry } from "@/lib/scoring/progress";

export type ProfileSearchResult = {
  id: string;
  display_name: string;
};

export type HoleRow = {
  id: string;
  hole_number: number;
  par: number;
  distance_m: number;
  notes: string | null;
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
  layoutId: string;
  layoutName: string;
  layoutSlug: string | null;
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
