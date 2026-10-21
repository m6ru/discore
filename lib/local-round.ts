import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { pickOne } from "@/lib/supabase/select-helpers";
import { friendlyError } from "@/lib/ui/friendly-error";

type Client = SupabaseClient<Database>;

/** One-slot anonymous trial. Distinct from the removed scorer outbox. */
export const LOCAL_TRIAL_STORAGE_KEY = "discore:local-trial";

const STROKE_MIN = 1;
const STROKE_MAX = 25;
const LEGACY_SCORER_ID = "trial";
const LEGACY_SCORER_NAME = "You";

export type LocalTrialHole = {
  id: string;
  hole_number: number;
  par: number;
  distance_m: number;
  notes: string | null;
};

export type LocalTrialPlayer = {
  id: string;
  name: string;
  isScorer: boolean;
};

export type LocalTrialScore = {
  holeId: string;
  playerId: string;
  strokes: number;
  ob: boolean;
};

export type LocalTrialStatus = "setup" | "active" | "completed";

export type LocalTrialRound = {
  version: 1;
  claimId: string;
  status: LocalTrialStatus;
  layoutId: string;
  courseName: string;
  courseSlug: string | null;
  layoutName: string;
  startedAt: string;
  completedAt: string | null;
  holes: LocalTrialHole[];
  players: LocalTrialPlayer[];
  scores: LocalTrialScore[];
};

export type ClaimLocalTrialResult =
  | { ok: true; outcome: "claimed"; roundId: string }
  | { ok: true; outcome: "skipped" }
  | { ok: true; outcome: "discarded" }
  | { ok: false; message: string };

let claimInFlight: Promise<ClaimLocalTrialResult> | null = null;

export function playerNameKey(name: string): string {
  return name.trim().toLowerCase();
}

export function createLocalTrialPlayer(name: string, isScorer: boolean): LocalTrialPlayer {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    isScorer,
  };
}

export function addGuestPlayer(
  players: LocalTrialPlayer[],
  name: string
): { ok: true; players: LocalTrialPlayer[] } | { ok: false; message: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, message: "Player name is required." };
  }
  if (players.some((player) => playerNameKey(player.name) === playerNameKey(trimmed))) {
    return { ok: false, message: "That name is already in the round." };
  }
  return {
    ok: true,
    players: [...players, createLocalTrialPlayer(trimmed, false)],
  };
}

export function removeGuestPlayer(
  players: LocalTrialPlayer[],
  playerId: string
): LocalTrialPlayer[] {
  return players.filter((player) => player.id !== playerId || player.isScorer);
}

export function setScorerName(
  players: LocalTrialPlayer[],
  name: string
): LocalTrialPlayer[] {
  return players.map((player) =>
    player.isScorer ? { ...player, name: name.trim() } : player
  );
}

export function startLocalTrialPlay(
  round: LocalTrialRound,
  players: LocalTrialPlayer[]
): { ok: true; round: LocalTrialRound } | { ok: false; message: string } {
  const rosterError = validateRoster(players, { requireScorerName: true });
  if (rosterError) {
    return { ok: false, message: rosterError };
  }

  const next: LocalTrialRound = {
    ...round,
    status: "active",
    players,
    startedAt: round.startedAt || new Date().toISOString(),
  };
  saveLocalTrial(next);
  return { ok: true, round: next };
}

export function parseLocalTrial(raw: unknown): LocalTrialRound | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const value = raw as Record<string, unknown>;
  if (value.version !== 1) {
    return null;
  }
  if (value.status !== "setup" && value.status !== "active" && value.status !== "completed") {
    return null;
  }
  if (typeof value.claimId !== "string" || value.claimId.length === 0) {
    return null;
  }
  if (typeof value.layoutId !== "string" || value.layoutId.length === 0) {
    return null;
  }
  if (typeof value.courseName !== "string" || value.courseName.length === 0) {
    return null;
  }
  if (value.courseSlug !== null && typeof value.courseSlug !== "string") {
    return null;
  }
  if (typeof value.layoutName !== "string" || value.layoutName.length === 0) {
    return null;
  }
  if (typeof value.startedAt !== "string" || value.startedAt.length === 0) {
    return null;
  }
  if (value.completedAt !== null && typeof value.completedAt !== "string") {
    return null;
  }
  if (!Array.isArray(value.holes) || value.holes.length === 0) {
    return null;
  }
  if (!Array.isArray(value.scores)) {
    return null;
  }

  const holes: LocalTrialHole[] = [];
  for (const hole of value.holes) {
    const parsed = parseHole(hole);
    if (!parsed) {
      return null;
    }
    holes.push(parsed);
  }

  const migrated = migrateLegacyPlayers(value.players);
  if (!migrated) {
    return null;
  }

  const scores: LocalTrialScore[] = [];
  for (const score of value.scores) {
    const parsed = parseScore(score, migrated.defaultPlayerId);
    if (!parsed) {
      return null;
    }
    scores.push(parsed);
  }

  return {
    version: 1,
    claimId: value.claimId,
    status: value.status,
    layoutId: value.layoutId,
    courseName: value.courseName,
    courseSlug: value.courseSlug,
    layoutName: value.layoutName,
    startedAt: value.startedAt,
    completedAt: value.completedAt,
    holes,
    players: migrated.players,
    scores,
  };
}

export function loadLocalTrial(): LocalTrialRound | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(LOCAL_TRIAL_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return parseLocalTrial(JSON.parse(stored));
  } catch {
    return null;
  }
}

export function saveLocalTrial(round: LocalTrialRound): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_TRIAL_STORAGE_KEY, JSON.stringify(round));
  } catch {
    // Ignore private-mode / quota errors.
  }
}

export function clearLocalTrial(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(LOCAL_TRIAL_STORAGE_KEY);
  } catch {
    // Ignore private-mode errors.
  }
}

export function isLocalTrialFullyScored(round: LocalTrialRound): boolean {
  if (round.players.length === 0) {
    return false;
  }
  return round.holes.every((hole) =>
    round.players.every((player) =>
      round.scores.some((score) => score.holeId === hole.id && score.playerId === player.id)
    )
  );
}

export function validateLocalTrialForClaim(round: LocalTrialRound): string | null {
  if (round.status !== "completed") {
    return "Trial is not completed.";
  }
  if (!round.completedAt) {
    return "Trial is missing a completion time.";
  }
  const rosterError = validateRoster(round.players, { requireScorerName: true });
  if (rosterError) {
    return rosterError;
  }
  if (!isLocalTrialFullyScored(round)) {
    return "Trial is missing hole scores.";
  }

  const holeIds = new Set(round.holes.map((hole) => hole.id));
  const playerIds = new Set(round.players.map((player) => player.id));
  for (const score of round.scores) {
    if (!holeIds.has(score.holeId)) {
      return "Trial has a score for an unknown hole.";
    }
    if (!playerIds.has(score.playerId)) {
      return "Trial has a score for an unknown player.";
    }
    if (
      !Number.isInteger(score.strokes) ||
      score.strokes < STROKE_MIN ||
      score.strokes > STROKE_MAX
    ) {
      return "Trial has an invalid stroke count.";
    }
  }

  return null;
}

export function createLocalTrial(input: {
  layoutId: string;
  courseName: string;
  courseSlug: string | null;
  layoutName: string;
  holes: LocalTrialHole[];
}): LocalTrialRound {
  return {
    version: 1,
    claimId: crypto.randomUUID(),
    status: "setup",
    layoutId: input.layoutId,
    courseName: input.courseName,
    courseSlug: input.courseSlug,
    layoutName: input.layoutName,
    startedAt: new Date().toISOString(),
    completedAt: null,
    holes: [...input.holes].sort((a, b) => a.hole_number - b.hole_number),
    players: [createLocalTrialPlayer("", true)],
    scores: [],
  };
}

export async function startLocalTrialFromLayout(
  supabase: Client,
  layoutId: string
): Promise<{ ok: true; round: LocalTrialRound } | { ok: false; message: string }> {
  const { data: layout, error: layoutError } = await supabase
    .from("layouts")
    .select("id, name, is_active, courses(name, slug)")
    .eq("id", layoutId)
    .maybeSingle();

  if (layoutError) {
    return { ok: false, message: friendlyError("Could not load the layout", layoutError) };
  }
  if (!layout || !layout.is_active) {
    return { ok: false, message: "That layout is not available." };
  }

  const { data: holeRows, error: holesError } = await supabase
    .from("holes")
    .select("id, hole_number, par, distance_m, notes")
    .eq("layout_id", layoutId)
    .order("hole_number", { ascending: true });

  if (holesError) {
    return { ok: false, message: friendlyError("Could not load the holes", holesError) };
  }

  const course = pickOne(layout.courses);
  const holes: LocalTrialHole[] = (holeRows ?? []).map((hole) => ({
    id: hole.id,
    hole_number: hole.hole_number,
    par: hole.par,
    distance_m: hole.distance_m,
    notes: hole.notes,
  }));

  if (holes.length === 0) {
    return { ok: false, message: "That layout has no holes yet." };
  }

  const round = createLocalTrial({
    layoutId: layout.id,
    courseName: course?.name?.trim() || "Course",
    courseSlug: course?.slug ?? null,
    layoutName: layout.name,
    holes,
  });
  saveLocalTrial(round);
  return { ok: true, round };
}

export function claimLocalTrialIfNeeded(supabase: Client): Promise<ClaimLocalTrialResult> {
  if (!claimInFlight) {
    claimInFlight = claimLocalTrial(supabase).finally(() => {
      claimInFlight = null;
    });
  }
  return claimInFlight;
}

async function claimLocalTrial(supabase: Client): Promise<ClaimLocalTrialResult> {
  const local = loadLocalTrial();
  if (!local) {
    return { ok: true, outcome: "skipped" };
  }

  if (local.status !== "completed") {
    clearLocalTrial();
    return { ok: true, outcome: "discarded" };
  }

  const validationError = validateLocalTrialForClaim(local);
  if (validationError) {
    clearLocalTrial();
    return { ok: true, outcome: "discarded" };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return { ok: false, message: friendlyError("Could not check your session", userError) };
  }
  if (!user) {
    return { ok: true, outcome: "skipped" };
  }

  // One transaction in the database (claim_trial): the round, guests and
  // scores are saved together or not at all. Safe to retry with the same claimId.
  const { data: roundId, error } = await supabase.rpc("claim_trial", {
    p_claim_id: local.claimId,
    p_layout_id: local.layoutId,
    p_started_at: local.startedAt,
    p_completed_at: local.completedAt ?? new Date().toISOString(),
    p_hole_ids: local.holes.map((hole) => hole.id),
    p_players: local.players.map((player) => ({
      id: player.id,
      name: player.name,
      is_scorer: player.isScorer,
    })),
    p_scores: local.scores.map((score) => ({
      player_id: score.playerId,
      hole_id: score.holeId,
      strokes: score.strokes,
      ob: score.ob,
    })),
  });

  if (error || !roundId) {
    return { ok: false, message: friendlyError("Could not save the round", error) };
  }

  clearLocalTrial();
  return { ok: true, outcome: "claimed", roundId };
}

function validateRoster(
  players: LocalTrialPlayer[],
  options: { requireScorerName: boolean }
): string | null {
  if (players.length === 0) {
    return "Add at least one player.";
  }
  const scorers = players.filter((player) => player.isScorer);
  if (scorers.length !== 1) {
    return "Exactly one scorer is required.";
  }
  if (options.requireScorerName && !scorers[0]!.name.trim()) {
    return "Your name is required.";
  }

  const keys = players.map((player) => playerNameKey(player.name));
  const named = keys.filter((key) => key.length > 0);
  if (named.length !== new Set(named).size) {
    return "Player names must be unique.";
  }
  if (players.some((player) => !player.isScorer && !player.name.trim())) {
    return "Guest names cannot be empty.";
  }

  return null;
}

function migrateLegacyPlayers(
  raw: unknown
): { players: LocalTrialPlayer[]; defaultPlayerId: string } | null {
  if (raw === undefined) {
    return {
      players: [{ id: LEGACY_SCORER_ID, name: LEGACY_SCORER_NAME, isScorer: true }],
      defaultPlayerId: LEGACY_SCORER_ID,
    };
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }

  const players: LocalTrialPlayer[] = [];
  for (const player of raw) {
    const parsed = parsePlayer(player);
    if (!parsed) {
      return null;
    }
    players.push(parsed);
  }

  const scorer = players.find((player) => player.isScorer);
  if (!scorer) {
    return null;
  }

  return { players, defaultPlayerId: scorer.id };
}

function parsePlayer(raw: unknown): LocalTrialPlayer | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== "string" || value.id.length === 0) {
    return null;
  }
  if (typeof value.name !== "string") {
    return null;
  }
  if (typeof value.isScorer !== "boolean") {
    return null;
  }
  return {
    id: value.id,
    name: value.name,
    isScorer: value.isScorer,
  };
}

function parseHole(raw: unknown): LocalTrialHole | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== "string" || value.id.length === 0) {
    return null;
  }
  if (typeof value.hole_number !== "number" || !Number.isInteger(value.hole_number)) {
    return null;
  }
  if (typeof value.par !== "number" || !Number.isInteger(value.par)) {
    return null;
  }
  if (typeof value.distance_m !== "number") {
    return null;
  }
  if (value.notes !== null && typeof value.notes !== "string") {
    return null;
  }
  return {
    id: value.id,
    hole_number: value.hole_number,
    par: value.par,
    distance_m: value.distance_m,
    notes: value.notes,
  };
}

function parseScore(raw: unknown, defaultPlayerId: string): LocalTrialScore | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const value = raw as Record<string, unknown>;
  if (typeof value.holeId !== "string" || value.holeId.length === 0) {
    return null;
  }
  const playerId =
    typeof value.playerId === "string" && value.playerId.length > 0
      ? value.playerId
      : defaultPlayerId;
  if (typeof value.strokes !== "number" || !Number.isInteger(value.strokes)) {
    return null;
  }
  if (typeof value.ob !== "boolean") {
    return null;
  }
  return {
    holeId: value.holeId,
    playerId,
    strokes: value.strokes,
    ob: value.ob,
  };
}
