import type { UnifiedPlayer } from "../round-types";

type Props = {
  unifiedPlayers: UnifiedPlayer[];
  isSubmitting: boolean;
  onRemovePlayer: (player: UnifiedPlayer) => void;
};

export function ParticipantsList({ unifiedPlayers, isSubmitting, onRemovePlayer }: Props) {
  return (
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
  );
}
