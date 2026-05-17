"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  formatVsPar,
  getFirstIncompleteHoleIndex,
  getTotalStrokes,
  segmentPlayerStats,
} from "@/lib/scoring/stats";
import { makeScoreLookupKey } from "@/lib/scoring/types";

const LEGACY_PENDING_QUEUE_PREFIX = "discore_pending_queue";

function clearLegacyPendingQueueStorage(roundId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(`${LEGACY_PENDING_QUEUE_PREFIX}:${roundId}`);
  } catch {
    /* ignore */
  }
}

function mergeHoleScoresByCell(
  base: HoleScoreRow[],
  incoming: HoleScoreRow[]
): HoleScoreRow[] {
  const next = [...base];
  for (const row of incoming) {
    const idx = next.findIndex(
      (s) =>
        s.participant_id === row.participant_id && s.hole_id === row.hole_id
    );
    if (idx >= 0) {
      next[idx] = row;
    } else {
      next.push(row);
    }
  }
  return next;
}

type ParticipantRow = {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  joined_at: string;
};

type InviteRow = {
  id: string;
  invited_user_id: string;
  status: string;
  created_at: string;
  profiles: {
    display_name: string;
  } | null;
};

type ProfileSearchResult = {
  id: string;
  display_name: string;
};

type UnifiedPlayer = {
  key: string;
  label: string;
  isPending: boolean;
  canRemove: boolean;
  source: "participant" | "invite";
  participantId?: string;
  invitedUserId?: string;
  inviteId?: string;
};

type HoleRow = {
  id: string;
  hole_number: number;
  par: number;
};

type HoleScoreRow = {
  id: string;
  participant_id: string;
  hole_id: string;
  strokes: number;
  ob: boolean;
  fairway_hit: boolean | null;
};

type Props = {
  roundId: string;
  roundStatus: string;
  scorerUserId: string;
  isScorer: boolean;
  currentUserId: string;
  scorerDisplayName: string;
  initialParticipants: ParticipantRow[];
  initialInvites: InviteRow[];
  holes: HoleRow[];
  initialHoleScores: HoleScoreRow[];
};

function segmentHoleTitle(segmentHoles: HoleRow[]): string {
  if (segmentHoles.length === 0) {
    return "";
  }
  const start = segmentHoles[0].hole_number;
  const end = segmentHoles[segmentHoles.length - 1].hole_number;
  return `Holes ${start}–${end}`;
}

type ScorecardSegmentProps = {
  segmentHoles: HoleRow[];
  allHoles: HoleRow[];
  scoreLookup: Map<string, number>;
  scoringParticipants: ParticipantRow[];
  getParticipantLabel: (participant: ParticipantRow) => string;
  activeHole: HoleRow | null;
  roundStatus: string;
};

function ScorecardSegment({
  segmentHoles,
  allHoles,
  scoreLookup,
  scoringParticipants,
  getParticipantLabel,
  activeHole,
  roundStatus,
}: ScorecardSegmentProps) {
  const segmentLayoutPar = segmentHoles.reduce((sum, h) => sum + h.par, 0);
  const tableColSpan = segmentHoles.length + 5;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold tracking-tight text-zinc-900">{segmentHoleTitle(segmentHoles)}</h3>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="w-max min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200">
              <th
                rowSpan={2}
                className="sticky left-0 z-20 min-w-[7.5rem] border-b border-r border-zinc-200 bg-zinc-50 px-2.5 py-2.5 align-bottom text-left text-xs font-semibold uppercase tracking-wide text-zinc-600"
              >
                Player
              </th>
              <th
                rowSpan={2}
                className="border-b border-r border-zinc-200 bg-zinc-100 px-2 py-2.5 text-center text-xs font-semibold text-zinc-800"
                title="Total strokes on all holes with a saved score"
              >
                Strokes
              </th>
              <th
                rowSpan={2}
                className="border-b border-r border-zinc-200 bg-zinc-100 px-2 py-2.5 text-center text-xs font-semibold text-zinc-800"
                title="Versus par for the full round (holes with scores only)"
              >
                +/−
              </th>
              {segmentHoles.map((h) => {
                const isCurrent = roundStatus === "active" && activeHole?.id === h.id;
                return (
                  <th
                    key={h.id}
                    className={`min-w-[2.75rem] border-b border-zinc-200 px-0.5 py-1.5 text-center text-xs font-semibold tabular-nums ${
                      isCurrent ? "bg-amber-100 text-amber-950" : "bg-zinc-50 text-zinc-800"
                    }`}
                  >
                    {h.hole_number}
                  </th>
                );
              })}
              <th
                rowSpan={2}
                className="border-b border-l border-r border-zinc-200 bg-emerald-50/80 px-2 py-2.5 text-center text-xs font-semibold text-emerald-950"
                title="Strokes on the holes in this block only"
              >
                Block
              </th>
              <th
                rowSpan={2}
                className="border-b border-zinc-200 bg-emerald-50/80 px-2 py-2.5 text-center text-xs font-semibold text-emerald-950"
                title="Versus par for this block only"
              >
                +/−
              </th>
            </tr>
            <tr>
              {segmentHoles.map((h) => {
                const isCurrent = roundStatus === "active" && activeHole?.id === h.id;
                return (
                  <th
                    key={`par-${h.id}`}
                    className={`border-b border-zinc-200 px-0.5 py-1 text-center text-[10px] font-medium tabular-nums ${
                      isCurrent ? "bg-amber-100 text-amber-900" : "bg-zinc-50 text-zinc-500"
                    }`}
                  >
                    P{h.par}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {scoringParticipants.length === 0 ? (
              <tr>
                <td colSpan={tableColSpan} className="px-3 py-4 text-center text-sm text-zinc-500">
                  No scoring players yet.
                </td>
              </tr>
            ) : (
              scoringParticipants.map((participant) => {
                const full = segmentPlayerStats(participant.id, allHoles, scoreLookup);
                const { totalStrokes, vsPar, thru } = segmentPlayerStats(
                  participant.id,
                  segmentHoles,
                  scoreLookup
                );
                return (
                  <tr key={participant.id} className="border-b border-zinc-100 last:border-b-0">
                    <td className="sticky left-0 z-10 whitespace-nowrap border-r border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-900">
                      {getParticipantLabel(participant)}
                    </td>
                    <td className="border-r border-zinc-100 bg-zinc-50/50 px-2 py-2 text-center text-xs font-semibold tabular-nums text-zinc-900">
                      {full.thru > 0 ? full.totalStrokes : "—"}
                    </td>
                    <td className="border-r border-zinc-100 bg-zinc-50/50 px-2 py-2 text-center text-xs font-semibold tabular-nums text-zinc-800">
                      {full.thru > 0 ? formatVsPar(full.vsPar) : "—"}
                    </td>
                    {segmentHoles.map((h) => {
                      const strokes = scoreLookup.get(makeScoreLookupKey(participant.id, h.id));
                      const isCurrent = roundStatus === "active" && activeHole?.id === h.id;
                      return (
                        <td
                          key={h.id}
                          className={`px-0.5 py-2 text-center text-xs tabular-nums ${
                            isCurrent ? "bg-amber-50/90 font-medium text-amber-950" : "text-zinc-800"
                          }`}
                        >
                          {strokes !== undefined ? strokes : "—"}
                        </td>
                      );
                    })}
                    <td className="border-l border-r border-emerald-100/80 bg-emerald-50/40 px-2 py-2 text-center text-xs font-semibold tabular-nums text-emerald-950">
                      {thru > 0 ? totalStrokes : "—"}
                    </td>
                    <td className="bg-emerald-50/40 px-2 py-2 text-center text-xs font-semibold tabular-nums text-emerald-950">
                      {thru > 0 ? formatVsPar(vsPar) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-200">
              <td className="sticky left-0 z-10 border-r border-zinc-200 bg-zinc-100 px-2.5 py-2 text-xs font-semibold text-zinc-700">
                Par
              </td>
              <td className="border-r border-zinc-100 bg-zinc-100 px-2 py-2 text-center text-xs text-zinc-400">
                —
              </td>
              <td className="border-r border-zinc-100 bg-zinc-100 px-2 py-2 text-center text-xs text-zinc-400">
                —
              </td>
              {segmentHoles.map((h) => (
                <td
                  key={`foot-par-${h.id}`}
                  className="bg-zinc-100 px-0.5 py-2 text-center text-xs tabular-nums text-zinc-600"
                >
                  {h.par}
                </td>
              ))}
              <td className="border-l border-r border-emerald-100 bg-emerald-50/60 px-2 py-2 text-center text-xs font-semibold tabular-nums text-emerald-900">
                {segmentLayoutPar}
              </td>
              <td className="bg-emerald-50/60 px-2 py-2 text-center text-xs text-emerald-800/70">
                —
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export function RoundSession({
  roundId,
  roundStatus,
  scorerUserId,
  isScorer,
  currentUserId,
  scorerDisplayName,
  initialParticipants,
  initialInvites,
  holes,
  initialHoleScores,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [participantName, setParticipantName] = useState("");
  const [participants, setParticipants] = useState<ParticipantRow[]>(initialParticipants);
  const [invites, setInvites] = useState<InviteRow[]>(initialInvites);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileSearchResult | null>(null);
  // Must match SSR output on first paint; merge `localStorage` queue in useLayoutEffect (client only).
  const [holeScores, setHoleScores] = useState<HoleScoreRow[]>(initialHoleScores);
  const [currentHoleIndex, setCurrentHoleIndex] = useState(() =>
    getFirstIncompleteHoleIndex(holes, initialParticipants, initialHoleScores)
  );
  const [draftStrokeInputs, setDraftStrokeInputs] = useState<Record<string, string>>({});
  const [draftObInputs, setDraftObInputs] = useState<Record<string, boolean>>({});
  const [lastSavedEvent, setLastSavedEvent] = useState<{
    holeId: string;
    participantId: string;
    savedAt: number;
  } | null>(null);
  /** `0` until after layout (matches SSR); avoids hydration drift vs Date.now(). */
  const [renderNow, setRenderNow] = useState(0);

  useEffect(() => {
    if (isScorer) {
      clearLegacyPendingQueueStorage(roundId);
    }
  }, [roundId, isScorer]);

  useLayoutEffect(() => {
    queueMicrotask(() => {
      setRenderNow(Date.now());
    });
  }, [roundId]);

  const inviteNameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const invite of invites) {
      if (invite.profiles?.display_name) {
        map.set(invite.invited_user_id, invite.profiles.display_name);
      }
    }
    return map;
  }, [invites]);

  const unifiedPlayers = useMemo(() => {
    const registeredParticipantIds = new Set<string>();
    const rows: UnifiedPlayer[] = [];

    for (const participant of participants) {
      if (participant.user_id) {
        registeredParticipantIds.add(participant.user_id);
      }

      if (participant.guest_name) {
        rows.push({
          key: `guest-${participant.id}`,
          label: participant.guest_name,
          isPending: false,
          canRemove: roundStatus === "draft" && isScorer,
          source: "participant",
          participantId: participant.id,
        });
        continue;
      }

      if (participant.user_id === scorerUserId) {
        rows.push({
          key: `user-${participant.id}`,
          label: `${scorerDisplayName} (scorer)`,
          isPending: false,
          canRemove: false,
          source: "participant",
          participantId: participant.id,
          invitedUserId: participant.user_id ?? undefined,
        });
        continue;
      }

      rows.push({
        key: `user-${participant.id}`,
        label: inviteNameByUserId.get(participant.user_id ?? "") ?? `Registered user (${participant.user_id})`,
        isPending: false,
        canRemove: roundStatus === "draft" && isScorer,
        source: "participant",
        participantId: participant.id,
        invitedUserId: participant.user_id ?? undefined,
      });
    }

    for (const invite of invites) {
      if (registeredParticipantIds.has(invite.invited_user_id)) {
        continue;
      }
      if (invite.status === "declined" || invite.status === "cancelled") {
        continue;
      }

      rows.push({
        key: `invite-${invite.id}`,
        label: invite.profiles?.display_name ?? invite.invited_user_id,
        isPending: invite.status === "pending",
        canRemove: roundStatus === "draft" && isScorer,
        source: "invite",
        inviteId: invite.id,
        invitedUserId: invite.invited_user_id,
      });
    }

    return rows;
  }, [participants, invites, scorerUserId, scorerDisplayName, inviteNameByUserId, roundStatus, isScorer]);

  const hasPendingInvite = useMemo(
    () => unifiedPlayers.some((player) => player.isPending),
    [unifiedPlayers]
  );
  // The scorer is guaranteed (server-side) to be in `round_participants`, so
  // there's no longer any synthetic row to filter out.
  const scoringParticipants = participants;
  const activeHole = holes[currentHoleIndex] ?? null;
  const canScore = roundStatus === "active" && !!activeHole && scoringParticipants.length > 0;
  const isLastHole = activeHole ? currentHoleIndex === holes.length - 1 : false;
  const holeIds = useMemo(() => holes.map((hole) => hole.id), [holes]);
  const firstNineHoleIds = useMemo(
    () => holes.filter((hole) => hole.hole_number <= 9).map((hole) => hole.id),
    [holes]
  );
  const allScoresComplete = useMemo(() => {
    if (holeIds.length === 0 || scoringParticipants.length === 0) {
      return false;
    }

    return holeIds.every((holeId) =>
      scoringParticipants.every((participant) =>
        holeScores.some((score) => score.hole_id === holeId && score.participant_id === participant.id)
      )
    );
  }, [holeIds, scoringParticipants, holeScores]);
  const frontNineComplete = useMemo(() => {
    if (firstNineHoleIds.length === 0 || scoringParticipants.length === 0) {
      return false;
    }

    return firstNineHoleIds.every((holeId) =>
      scoringParticipants.every((participant) =>
        holeScores.some((score) => score.hole_id === holeId && score.participant_id === participant.id)
      )
    );
  }, [firstNineHoleIds, scoringParticipants, holeScores]);
  const showFinalSummary = roundStatus === "completed" || (roundStatus === "active" && allScoresComplete);
  const showFrontNineSummary = roundStatus === "active" && !showFinalSummary && frontNineComplete;

  const sortedHoles = useMemo(
    () => [...holes].sort((a, b) => a.hole_number - b.hole_number),
    [holes]
  );

  const scoreLookup = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of holeScores) {
      map.set(makeScoreLookupKey(row.participant_id, row.hole_id), row.strokes);
    }
    return map;
  }, [holeScores]);

  const holeSegments = useMemo(() => {
    const segments: HoleRow[][] = [];
    for (let i = 0; i < sortedHoles.length; i += 9) {
      segments.push(sortedHoles.slice(i, i + 9));
    }
    return segments;
  }, [sortedHoles]);

  const holeProgressDots = useMemo(() => {
    return sortedHoles.map((h) => {
      const allScored =
        scoringParticipants.length > 0 &&
        scoringParticipants.every((p) => scoreLookup.get(makeScoreLookupKey(p.id, h.id)) !== undefined);
      const isCurrent = roundStatus === "active" && activeHole?.id === h.id;
      return { hole: h, allScored, isCurrent };
    });
  }, [sortedHoles, scoringParticipants, scoreLookup, activeHole, roundStatus]);

  const lastSavedLabel = useMemo(() => {
    if (!lastSavedEvent || renderNow === 0) {
      return null;
    }
    const hole = sortedHoles.find((h) => h.id === lastSavedEvent.holeId);
    if (!hole) {
      return null;
    }
    const participant = participants.find((p) => p.id === lastSavedEvent.participantId);
    const participantLabel = participant
      ? unifiedPlayers.find((item) => item.participantId === participant.id)?.label ??
        participant.guest_name ??
        "Player"
      : "Player";
    const cleanLabel = participantLabel.replace(" (pending)", "");
    const diffMs = Math.max(0, renderNow - lastSavedEvent.savedAt);
    let relative: string;
    if (diffMs < 10_000) {
      relative = "just now";
    } else if (diffMs < 60_000) {
      relative = `${Math.floor(diffMs / 1000)}s ago`;
    } else if (diffMs < 3_600_000) {
      relative = `${Math.floor(diffMs / 60_000)}m ago`;
    } else {
      relative = `${Math.floor(diffMs / 3_600_000)}h ago`;
    }
    return `Hole ${hole.hole_number} saved by ${cleanLabel} · ${relative}`;
  }, [lastSavedEvent, renderNow, sortedHoles, participants, unifiedPlayers]);

  const leaderboardRows = useMemo(() => {
    const rows = scoringParticipants.map((participant) => {
      const stats = segmentPlayerStats(participant.id, sortedHoles, scoreLookup);
      const label =
        unifiedPlayers.find((item) => item.participantId === participant.id)?.label ??
        participant.guest_name ??
        "Player";
      return {
        participantId: participant.id,
        label: label.replace(" (pending)", ""),
        totalStrokes: stats.totalStrokes,
        vsPar: stats.vsPar,
        thru: stats.thru,
      };
    });
    rows.sort((a, b) => {
      if (a.thru === 0 && b.thru === 0) return a.label.localeCompare(b.label);
      if (a.thru === 0) return 1;
      if (b.thru === 0) return -1;
      if (a.vsPar !== b.vsPar) return a.vsPar - b.vsPar;
      if (a.totalStrokes !== b.totalStrokes) return a.totalStrokes - b.totalStrokes;
      return a.label.localeCompare(b.label);
    });
    return rows;
  }, [scoringParticipants, sortedHoles, scoreLookup, unifiedPlayers]);

  function getStrokeInputValue(participantId: string): string {
    if (!activeHole) {
      return "";
    }

    const key = `${activeHole.id}:${participantId}`;
    const draftValue = draftStrokeInputs[key];
    if (draftValue !== undefined) {
      return draftValue;
    }

    const existing = holeScores.find(
      (score) => score.hole_id === activeHole.id && score.participant_id === participantId
    );
    return existing ? String(existing.strokes) : "";
  }

  function isObChecked(participantId: string): boolean {
    if (!activeHole) {
      return false;
    }
    const key = `${activeHole.id}:${participantId}`;
    const draftValue = draftObInputs[key];
    if (draftValue !== undefined) {
      return draftValue;
    }
    const existing = holeScores.find(
      (score) => score.hole_id === activeHole.id && score.participant_id === participantId
    );
    return existing?.ob ?? false;
  }

  function getParticipantLabel(participant: ParticipantRow): string {
    const player =
      unifiedPlayers.find((item) => item.participantId === participant.id)?.label ??
      participant.guest_name ??
      "Player";
    return player.replace(" (pending)", "");
  }

  const loadParticipants = useCallback(async () => {
    const { data, error } = await supabase
      .from("round_participants")
      .select("id, user_id, guest_name, joined_at")
      .eq("round_id", roundId)
      .order("joined_at", { ascending: true });

    if (error) {
      setStatus(`Failed to refresh participants: ${error.message}`);
      return;
    }

    setParticipants(data ?? []);
  }, [supabase, roundId]);

  const loadInvites = useCallback(async () => {
    const { data, error } = await supabase
      .from("round_invitations")
      .select("id, invited_user_id, status, created_at, profiles!round_invitations_invited_user_id_fkey(display_name)")
      .eq("round_id", roundId)
      .order("created_at", { ascending: true });

    if (error) {
      setStatus(`Failed to refresh invites: ${error.message}`);
      return;
    }

    setInvites((data ?? []) as InviteRow[]);
  }, [supabase, roundId]);

  const loadHoleScores = useCallback(async () => {
    const { data, error } = await supabase
      .from("hole_scores")
      .select("id, participant_id, hole_id, strokes, ob, fairway_hit")
      .eq("round_id", roundId);

    if (error) {
      setStatus(`Failed to refresh scores: ${error.message}`);
      return;
    }

    setHoleScores((data ?? []) as HoleScoreRow[]);
  }, [supabase, roundId]);

  useEffect(() => {
    if (roundStatus === "completed" || roundStatus === "abandoned") {
      clearLegacyPendingQueueStorage(roundId);
    }
  }, [roundStatus, roundId]);

  useEffect(() => {
    if (!lastSavedEvent) {
      return;
    }
    const interval = setInterval(() => setRenderNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, [lastSavedEvent]);

  useEffect(() => {
    const channel = supabase
      .channel(`round-session:${roundId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round_participants", filter: `round_id=eq.${roundId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id?: string } | null;
            if (oldRow?.id) {
              const deletedId = oldRow.id;
              setParticipants((prev) => prev.filter((row) => row.id !== deletedId));
            } else {
              void loadParticipants();
            }
            return;
          }
          const newRow = payload.new as Partial<ParticipantRow> | null;
          if (!newRow || !newRow.id) {
            void loadParticipants();
            return;
          }
          const row: ParticipantRow = {
            id: newRow.id,
            user_id: newRow.user_id ?? null,
            guest_name: newRow.guest_name ?? null,
            joined_at: newRow.joined_at ?? new Date().toISOString(),
          };
          setParticipants((prev) => {
            const filtered = prev.filter((existing) => existing.id !== row.id);
            return [...filtered, row].sort((a, b) => a.joined_at.localeCompare(b.joined_at));
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round_invitations", filter: `round_id=eq.${roundId}` },
        () => {
          void loadInvites();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hole_scores", filter: `round_id=eq.${roundId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id?: string } | null;
            if (oldRow?.id) {
              const deletedId = oldRow.id;
              setHoleScores((prev) => prev.filter((row) => row.id !== deletedId));
            } else {
              void loadHoleScores();
            }
            return;
          }
          const newRow = payload.new as Partial<HoleScoreRow> | null;
          if (
            !newRow ||
            !newRow.id ||
            !newRow.participant_id ||
            !newRow.hole_id ||
            typeof newRow.strokes !== "number"
          ) {
            void loadHoleScores();
            return;
          }
          const row: HoleScoreRow = {
            id: newRow.id,
            participant_id: newRow.participant_id,
            hole_id: newRow.hole_id,
            strokes: newRow.strokes,
            ob: typeof newRow.ob === "boolean" ? newRow.ob : false,
            fairway_hit:
              typeof newRow.fairway_hit === "boolean" ? newRow.fairway_hit : null,
          };
          setHoleScores((prev) => {
            const filtered = prev.filter(
              (existing) =>
                !(
                  existing.participant_id === row.participant_id &&
                  existing.hole_id === row.hole_id
                )
            );
            return [...filtered, row];
          });
          const savedAt = Date.now();
          setLastSavedEvent({
            holeId: row.hole_id,
            participantId: row.participant_id,
            savedAt,
          });
          setRenderNow(savedAt);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    supabase,
    roundId,
    loadParticipants,
    loadInvites,
    loadHoleScores,
  ]);

  useEffect(() => {
    const query = participantName.trim();
    if (roundStatus !== "draft" || query.length < 2) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .ilike("display_name", `%${query}%`)
        .neq("id", currentUserId)
        .limit(8);

      if (error) {
        setStatus(`Participant lookup failed: ${error.message}`);
        setIsSearching(false);
        return;
      }

      const matches = (data ?? []) as ProfileSearchResult[];
      setSearchResults(matches);

      if (selectedProfile && !matches.some((match) => match.id === selectedProfile.id)) {
        setSelectedProfile(null);
      }

      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [participantName, roundStatus, supabase, currentUserId, selectedProfile]);

  async function onAddParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isScorer) {
      return;
    }

    if (roundStatus !== "draft") {
      setStatus("Participants can only be changed while the round is in draft.");
      return;
    }

    const trimmedName = participantName.trim();
    if (!trimmedName) {
      setStatus("Participant name is required.");
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    if (selectedProfile) {
      const { error: inviteError } = await supabase.from("round_invitations").insert({
        round_id: roundId,
        invited_user_id: selectedProfile.id,
        invited_by: currentUserId,
      });

      if (inviteError) {
        setStatus(`Invite failed: ${inviteError.message}`);
        setIsSubmitting(false);
        return;
      }

      setParticipantName("");
      setSelectedProfile(null);
      setSearchResults([]);
      await loadInvites();
      setIsSubmitting(false);
      return;
    }

    const { error: guestInsertError } = await supabase.from("round_participants").insert({
      round_id: roundId,
      guest_name: trimmedName,
    });

    if (guestInsertError) {
      setStatus(
        [
          `Participant add failed: ${guestInsertError.message}`,
          `code=${guestInsertError.code ?? "n/a"}`,
          `details=${guestInsertError.details ?? "n/a"}`,
        ].join(" | ")
      );
      setIsSubmitting(false);
      return;
    }

    setParticipantName("");
    setSelectedProfile(null);
    setSearchResults([]);
    await loadParticipants();
    setIsSubmitting(false);
  }

  async function onStartRound() {
    if (!isScorer) {
      return;
    }

    setIsTransitioning(true);
    setStatus(null);

    const { error } = await supabase
      .from("rounds")
      .update({
        status: "active",
        started_at: new Date().toISOString(),
      })
      .eq("id", roundId);

    if (error) {
      setStatus(`Start failed: ${error.message}`);
      setIsTransitioning(false);
      return;
    }

    setIsTransitioning(false);
    router.refresh();
  }

  async function onDeleteDraft() {
    if (!isScorer) {
      return;
    }

    const confirmed = window.confirm("Delete this draft round?");
    if (!confirmed) {
      return;
    }

    setIsTransitioning(true);
    setStatus(null);

    const { error } = await supabase.from("rounds").delete().eq("id", roundId);
    if (error) {
      setStatus(`Delete failed: ${error.message}`);
      setIsTransitioning(false);
      return;
    }

    clearLegacyPendingQueueStorage(roundId);
    router.push("/");
    router.refresh();
  }

  async function onAbandonRound() {
    if (!isScorer) {
      return;
    }

    const confirmed = window.confirm("Abandon this round?");
    if (!confirmed) {
      return;
    }

    setIsTransitioning(true);
    setStatus(null);

    const { error } = await supabase
      .from("rounds")
      .update({ status: "abandoned" })
      .eq("id", roundId);
    if (error) {
      setStatus(`Abandon failed: ${error.message}`);
      setIsTransitioning(false);
      return;
    }

    clearLegacyPendingQueueStorage(roundId);
    router.push("/");
    router.refresh();
  }

  async function onRemovePlayer(player: UnifiedPlayer) {
    if (!isScorer) {
      return;
    }

    if (roundStatus !== "draft" || !player.canRemove) {
      return;
    }

    setStatus(null);
    setIsSubmitting(true);

    if (player.source === "invite" && player.inviteId) {
      const { error } = await supabase
        .from("round_invitations")
        .update({ status: "cancelled" })
        .eq("id", player.inviteId);

      if (error) {
        setStatus(`Remove failed: ${error.message}`);
        setIsSubmitting(false);
        return;
      }

      await loadInvites();
      setIsSubmitting(false);
      return;
    }

    if (player.source === "participant" && player.participantId) {
      const { error: deleteError } = await supabase
        .from("round_participants")
        .delete()
        .eq("id", player.participantId);

      if (deleteError) {
        setStatus(`Remove failed: ${deleteError.message}`);
        setIsSubmitting(false);
        return;
      }

      if (player.invitedUserId) {
        await supabase
          .from("round_invitations")
          .update({ status: "cancelled" })
          .eq("round_id", roundId)
          .eq("invited_user_id", player.invitedUserId)
          .in("status", ["pending", "accepted"]);
      }

      await loadParticipants();
      await loadInvites();
      setIsSubmitting(false);
    }
  }

  async function saveCurrentHoleScores(): Promise<boolean> {
    if (!isScorer || !activeHole) {
      return false;
    }

    type RowInput = { participantId: string; strokes: number; ob: boolean };
    const rowInputs: RowInput[] = [];

    for (const participant of scoringParticipants) {
      const rawValue = getStrokeInputValue(participant.id).trim();
      const strokes = Number(rawValue);

      if (!Number.isInteger(strokes) || strokes < 1 || strokes > 25) {
        setStatus(
          `Enter valid strokes (1-25) for every player on hole ${activeHole.hole_number}.`
        );
        return false;
      }

      rowInputs.push({
        participantId: participant.id,
        strokes,
        ob: isObChecked(participant.id),
      });
    }

    const payload = rowInputs.map((r) => ({
      round_id: roundId,
      participant_id: r.participantId,
      hole_id: activeHole.id,
      strokes: r.strokes,
      ob: r.ob,
      fairway_hit: null as boolean | null,
    }));

    setIsSubmitting(true);
    setStatus(null);

    const { data, error } = await supabase
      .from("hole_scores")
      .upsert(payload, { onConflict: "round_id,participant_id,hole_id" })
      .select("id, participant_id, hole_id, strokes, ob, fairway_hit");

    setIsSubmitting(false);

    if (error) {
      setStatus(`Could not save scores: ${error.message}`);
      return false;
    }

    const returned = (data ?? []) as HoleScoreRow[];
    setHoleScores((prev) => {
      const without = prev.filter(
        (score) =>
          !rowInputs.some(
            (r) =>
              r.participantId === score.participant_id &&
              activeHole.id === score.hole_id
          )
      );
      return mergeHoleScoresByCell(without, returned);
    });

    setDraftStrokeInputs((prev) => {
      const next = { ...prev };
      for (const participant of scoringParticipants) {
        delete next[`${activeHole.id}:${participant.id}`];
      }
      return next;
    });
    setDraftObInputs((prev) => {
      const next = { ...prev };
      for (const participant of scoringParticipants) {
        delete next[`${activeHole.id}:${participant.id}`];
      }
      return next;
    });

    queueMicrotask(() => {
      const savedAt = Date.now();
      setLastSavedEvent({
        holeId: activeHole.id,
        participantId: scoringParticipants[0]!.id,
        savedAt,
      });
      setRenderNow(savedAt);
    });
    return true;
  }

  async function onSaveAndAdvanceHole() {
    const saved = await saveCurrentHoleScores();
    if (!saved || !activeHole) {
      return;
    }

    if (isLastHole) {
      setStatus("Final hole saved. Review summary and end the round.");
      return;
    }

    setCurrentHoleIndex((index) => Math.min(index + 1, holes.length - 1));
    setStatus(null);
  }

  function onPreviousHole() {
    setStatus(null);
    setCurrentHoleIndex((index) => Math.max(index - 1, 0));
  }

  async function onCompleteRound() {
    const confirmed = window.confirm("Complete this round?");
    if (!confirmed) {
      return;
    }

    const saved = await saveCurrentHoleScores();
    if (!saved) {
      return;
    }

    setIsTransitioning(true);
    setStatus(null);

    const { error } = await supabase
      .from("rounds")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", roundId);
    if (error) {
      setStatus(`Complete failed: ${error.message}`);
      setIsTransitioning(false);
      return;
    }

    clearLegacyPendingQueueStorage(roundId);
    router.push("/");
    router.refresh();
  }

  return (
    <section className="space-y-5 rounded-lg border border-zinc-200 p-4">
      <h2 className="text-lg font-semibold">Round</h2>

      <h3 className="text-base font-semibold text-zinc-800">Participants</h3>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-zinc-700">Players</h3>
        {unifiedPlayers.length === 0 ? <p className="text-sm text-zinc-500">No players yet.</p> : null}
        {unifiedPlayers.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {unifiedPlayers.map((player) => (
              <li
                key={player.key}
                className="flex items-center justify-between gap-3 rounded border border-zinc-200 px-3 py-2"
              >
                <span>
                  {player.label}
                  {player.isPending ? <span className="ml-2 text-xs text-zinc-500">(pending)</span> : null}
                </span>
                {player.canRemove ? (
                  <button
                    type="button"
                    onClick={() => void onRemovePlayer(player)}
                    disabled={isSubmitting}
                    className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-60"
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {roundStatus === "draft" && isScorer ? (
        <form onSubmit={onAddParticipant} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1 text-sm">
            <span>Player name</span>
            <input
              value={participantName}
              onChange={(event) => {
                setParticipantName(event.target.value);
                setSelectedProfile(null);
              }}
              className="w-full rounded border border-zinc-300 px-3 py-2"
              placeholder="Type player name or email"
              maxLength={80}
            />
            {participantName.trim().length >= 2 ? (
              <div className="mt-2 rounded border border-zinc-200 bg-white">
                {isSearching ? (
                  <p className="px-3 py-2 text-xs text-zinc-500">Searching...</p>
                ) : searchResults.length > 0 ? (
                  <ul className="max-h-40 overflow-auto">
                    {searchResults.map((profile) => (
                      <li key={profile.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProfile(profile);
                            setParticipantName(profile.display_name);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 ${
                            selectedProfile?.id === profile.id ? "bg-zinc-100" : ""
                          }`}
                        >
                          {profile.display_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-2 text-xs text-zinc-500">No registered match, will add as guest.</p>
                )}
              </div>
            ) : null}
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSubmitting ? "Adding..." : "Add player"}
          </button>
        </form>
      ) : null}

      {status ? (
        <p className="rounded-md border border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-700">{status}</p>
      ) : null}

      {roundStatus === "active" && lastSavedLabel ? (
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          {lastSavedLabel}
        </p>
      ) : null}

      {showFrontNineSummary ? (
        <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <h3 className="text-sm font-semibold text-zinc-800">Front 9 summary</h3>
          <ul className="space-y-1 text-sm text-zinc-700">
            {scoringParticipants.map((participant) => (
              <li key={`front9-${participant.id}`} className="flex items-center justify-between">
                <span>{getParticipantLabel(participant)}</span>
                <span className="font-medium">{getTotalStrokes(holeScores, participant.id, firstNineHoleIds)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showFinalSummary ? (
        <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <h3 className="text-sm font-semibold text-zinc-800">Round summary</h3>
          <ul className="space-y-1 text-sm text-zinc-700">
            {scoringParticipants.map((participant) => (
              <li key={`final-${participant.id}`} className="flex items-center justify-between">
                <span>{getParticipantLabel(participant)}</span>
                <span className="font-medium">{getTotalStrokes(holeScores, participant.id, holeIds)}</span>
              </li>
            ))}
          </ul>
          {roundStatus === "active" && isScorer ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onCompleteRound()}
                disabled={isSubmitting || isTransitioning}
                className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {isTransitioning ? "Working..." : "Confirm and end round"}
              </button>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Round is completed. Scores are now read-only.</p>
          )}
        </div>
      ) : null}

      {roundStatus === "active" && !showFinalSummary ? (
        <div
          className={`rounded-2xl border shadow-sm ${
            isScorer && canScore
              ? "border-zinc-200/90 bg-gradient-to-b from-white to-zinc-50 p-5 sm:p-6"
              : "border-zinc-200 bg-zinc-50/40 p-4"
          }`}
        >
          {!canScore ? (
            <p className="text-sm text-zinc-500">No participants available for scoring.</p>
          ) : isScorer ? (
            activeHole ? (
              <div className="space-y-6">
                <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center gap-2 sm:justify-start">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Enter scores</p>
                  </div>
                  <div className="mt-2 flex flex-col items-center gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                    <p className="text-4xl font-semibold tabular-nums tracking-tight text-zinc-900">
                      {activeHole.hole_number}
                      <span className="text-xl font-normal text-zinc-400"> / {holes.length}</span>
                    </p>
                    <span className="hidden h-6 w-px bg-zinc-200 sm:inline-block" aria-hidden />
                    <p className="text-base text-zinc-500">
                      Par <span className="font-semibold text-zinc-800">{activeHole.par}</span>
                    </p>
                  </div>
                </div>

                {sortedHoles.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start" aria-hidden>
                    {holeProgressDots.map(({ hole, allScored, isCurrent }) => (
                      <span
                        key={hole.id}
                        title={`Hole ${hole.hole_number}${allScored ? " — saved" : ""}${isCurrent ? " — current" : ""}`}
                        className={`h-2.5 w-2.5 shrink-0 rounded-full transition-colors ${
                          isCurrent
                            ? "bg-amber-400 ring-2 ring-amber-300/80 ring-offset-2 ring-offset-white"
                            : allScored
                              ? "bg-emerald-500"
                              : "bg-zinc-300"
                        }`}
                      />
                    ))}
                  </div>
                ) : null}

                <div className="space-y-4">
                  {scoringParticipants.map((participant) => {
                    const obChecked = isObChecked(participant.id);
                    const obKey = `${activeHole.id}:${participant.id}`;
                    return (
                      <div key={participant.id} className="space-y-2">
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-medium text-zinc-500">
                            {getParticipantLabel(participant)}
                          </span>
                          <div className="flex items-stretch gap-2">
                            <input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={25}
                              value={getStrokeInputValue(participant.id)}
                              onChange={(event) =>
                                setDraftStrokeInputs((prev) => ({
                                  ...prev,
                                  [`${activeHole.id}:${participant.id}`]: event.target.value,
                                }))
                              }
                              className="h-14 flex-1 rounded-xl border-2 border-zinc-200 bg-white px-4 text-center text-2xl font-semibold tabular-nums text-zinc-900 shadow-inner outline-none transition-colors placeholder:text-zinc-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
                              placeholder="—"
                              autoComplete="off"
                            />
                            <button
                              type="button"
                              role="switch"
                              aria-checked={obChecked}
                              aria-label={`Toggle OB for ${getParticipantLabel(participant)}`}
                              onClick={() =>
                                setDraftObInputs((prev) => ({
                                  ...prev,
                                  [obKey]: !obChecked,
                                }))
                              }
                              className={`h-14 w-16 shrink-0 rounded-xl border-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
                                obChecked
                                  ? "border-rose-500 bg-rose-500 text-white shadow-sm"
                                  : "border-zinc-200 bg-white text-zinc-500 hover:border-rose-200 hover:text-rose-600"
                              }`}
                            >
                              OB
                            </button>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:flex-wrap sm:justify-end">
                  {currentHoleIndex > 0 ? (
                    <button
                      type="button"
                      onClick={onPreviousHole}
                      disabled={isSubmitting}
                      className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-60"
                    >
                      Back
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void onSaveAndAdvanceHole()}
                    disabled={isSubmitting}
                    className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {isSubmitting ? "Saving…" : isLastHole ? "Save scores" : "Save & next hole"}
                  </button>
                </div>
              </div>
            ) : null
          ) : (
            <p className="text-sm text-zinc-600">
              Current hole: <span className="font-medium">{activeHole?.hole_number}</span> of{" "}
              <span className="font-medium">{holes.length}</span> (par {activeHole?.par}). Follow the scorecard below
              for hole-by-hole scores.
            </p>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-2">
        {roundStatus === "draft" && isScorer ? (
          <>
            <button
              type="button"
              onClick={onStartRound}
              disabled={isTransitioning || hasPendingInvite}
              className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isTransitioning ? "Working..." : "Start round"}
            </button>
            <button
              type="button"
              onClick={onDeleteDraft}
              disabled={isTransitioning}
              className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
            >
              Delete draft
            </button>
          </>
        ) : null}

        {roundStatus === "active" && isScorer ? (
          <button
            type="button"
            onClick={onAbandonRound}
            disabled={isTransitioning}
            className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
          >
            Abandon round
          </button>
        ) : null}
      </div>

      {roundStatus === "draft" && hasPendingInvite && isScorer ? (
        <p className="text-xs text-zinc-500">
          Resolve pending invitations (accept or remove) before starting the round.
        </p>
      ) : null}

      {roundStatus !== "draft" &&
      leaderboardRows.length > 0 &&
      leaderboardRows.some((row) => row.thru > 0) ? (
        <div className="space-y-3 border-t border-zinc-200 pt-8">
          <div className="flex items-baseline justify-between">
            <h3 className="text-base font-semibold tracking-tight text-zinc-900">Leaderboard</h3>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              Sorted by vs par
            </p>
          </div>
          <ol className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
            {leaderboardRows.map((row, index) => {
              const positionLabel = row.thru === 0 ? "—" : String(index + 1);
              const vsParLabel = row.thru > 0 ? formatVsPar(row.vsPar) : "—";
              const vsParTone =
                row.thru === 0
                  ? "text-zinc-400"
                  : row.vsPar < 0
                    ? "text-emerald-700"
                    : row.vsPar > 0
                      ? "text-rose-700"
                      : "text-zinc-700";
              return (
                <li
                  key={row.participantId}
                  className="flex items-center gap-3 px-3 py-2 text-sm"
                >
                  <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-zinc-500">
                    {positionLabel}
                  </span>
                  <span className="flex-1 truncate text-zinc-900">{row.label}</span>
                  <span
                    className={`w-12 shrink-0 text-right text-sm font-semibold tabular-nums ${vsParTone}`}
                  >
                    {vsParLabel}
                  </span>
                  <span className="w-10 shrink-0 text-right text-sm tabular-nums text-zinc-700">
                    {row.thru > 0 ? row.totalStrokes : "—"}
                  </span>
                  <span className="w-16 shrink-0 text-right text-[11px] text-zinc-500">
                    thru {row.thru}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

      {holeSegments.length > 0 ? (
        <div className="space-y-10 border-t border-zinc-200 pt-8">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-zinc-900">Scorecard</h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500">
              Up to nine holes per table. <span className="font-medium text-zinc-600">Strokes</span> and the first{" "}
              <span className="font-medium text-zinc-600">+/−</span> are for the full round;{" "}
              <span className="font-medium text-emerald-800">Block</span> columns count only that section. Scroll
              sideways on narrow screens.
            </p>
          </div>
          {holeSegments.map((segment, idx) => (
            <ScorecardSegment
              key={`seg-${idx}-${segment[0]?.id ?? idx}`}
              segmentHoles={segment}
              allHoles={sortedHoles}
              scoreLookup={scoreLookup}
              scoringParticipants={scoringParticipants}
              getParticipantLabel={getParticipantLabel}
              activeHole={activeHole}
              roundStatus={roundStatus}
            />
          ))}
        </div>
      ) : sortedHoles.length === 0 ? (
        <p className="text-sm text-zinc-500">No holes loaded for this layout.</p>
      ) : null}
    </section>
  );
}
