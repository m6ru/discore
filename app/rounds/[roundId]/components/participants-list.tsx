import type { UnifiedPlayer } from "../round-types";
import { Button } from "@/components/ui/button";

type Props = {
  unifiedPlayers: UnifiedPlayer[];
  isSubmitting: boolean;
  onRemovePlayer: (player: UnifiedPlayer) => void;
};

export function ParticipantsList({ unifiedPlayers, isSubmitting, onRemovePlayer }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Players</h3>
      {unifiedPlayers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No players yet.</p>
      ) : null}
      {unifiedPlayers.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {unifiedPlayers.map((player) => (
            <li
              key={player.key}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
            >
              <span>
                {player.label}
                {player.isPending ? (
                  <span className="ml-2 text-xs text-muted-foreground">(pending)</span>
                ) : null}
              </span>
              {player.canRemove ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void onRemovePlayer(player)}
                  disabled={isSubmitting}
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
