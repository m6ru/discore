export type HomeInvite = {
  id: string;
  round_id: string;
  created_at: string;
  course_name: string | null;
  layout_name: string | null;
  inviter_display_name: string | null;
};

export type HomeActiveRound = {
  id: string;
  scorer_id: string;
  started_at: string | null;
  course_name: string;
  layout_name: string;
};

export type HomeRecentRound = {
  id: string;
  layoutId: string;
  courseName: string;
  layoutName: string;
  status: "completed" | "abandoned";
  completedAt: string | null;
  startedAt: string | null;
  totalStrokes: number | null;
  vsPar: number | null;
};

export type HomeProfile = {
  first_name: string | null;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
};

export type HomeData = {
  profile: HomeProfile | null;
  invites: HomeInvite[];
  activeRounds: HomeActiveRound[];
  recentRounds: HomeRecentRound[];
  hasJoinedRound: boolean;
  profileOnboardingComplete: boolean;
};
