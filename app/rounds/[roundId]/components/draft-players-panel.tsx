import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import type { ProfileSearchResult, UnifiedPlayer } from "../round-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ROW_CLASS = "flex min-h-13 items-center gap-2.5 border-b";

function playerStatus(
  player: UnifiedPlayer,
  scorerUserId: string,
  currentUserId: string
): string | null {
  if (player.key.startsWith("guest-")) {
    return "Guest, no account";
  }
  if (player.isPending) {
    return "Invite sent · waiting to accept";
  }
  if (player.invitedUserId === scorerUserId) {
    // You know you are the one scoring; others see who is.
    return player.invitedUserId === currentUserId ? null : "Scorer";
  }
  return player.invitedUserId === currentUserId ? "You · joined" : "Joined";
}

type PlayerRowsProps = {
  unifiedPlayers: UnifiedPlayer[];
  scorerUserId: string;
  currentUserId: string;
  isSubmitting: boolean;
  onRemovePlayer: (player: UnifiedPlayer) => void;
};

function PlayerRows({
  unifiedPlayers,
  scorerUserId,
  currentUserId,
  isSubmitting,
  onRemovePlayer,
}: PlayerRowsProps) {
  return (
    <>
      {unifiedPlayers.map((player) => (
        <div key={player.key} className={ROW_CLASS}>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold">{player.label}</span>
            {playerStatus(player, scorerUserId, currentUserId) ? (
              <span
                className={
                  player.isPending
                    ? "block text-[13px] text-[#8a5a1c]"
                    : "block text-[13px] text-muted-foreground"
                }
              >
                {playerStatus(player, scorerUserId, currentUserId)}
              </span>
            ) : null}
          </span>
          {player.canRemove ? (
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 shrink-0 px-2 font-semibold text-muted-foreground"
              onClick={() => void onRemovePlayer(player)}
              disabled={isSubmitting}
            >
              Remove
            </Button>
          ) : null}
        </div>
      ))}
    </>
  );
}

type Props = {
  unifiedPlayers: UnifiedPlayer[];
  scorerUserId: string;
  currentUserId: string;
  isScorer: boolean;
  isSubmitting: boolean;
  showAddForm: boolean;
  participantName: string;
  isSearching: boolean;
  searchResults: ProfileSearchResult[];
  selectedProfile: ProfileSearchResult | null;
  onRemovePlayer: (player: UnifiedPlayer) => void;
  onShowAddForm: () => void;
  onParticipantNameChange: (value: string) => void;
  onSelectProfile: (profile: ProfileSearchResult) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelAdd: () => void;
};

export function DraftPlayersPanel({
  unifiedPlayers,
  scorerUserId,
  currentUserId,
  isScorer,
  isSubmitting,
  showAddForm,
  participantName,
  isSearching,
  searchResults,
  selectedProfile,
  onRemovePlayer,
  onShowAddForm,
  onParticipantNameChange,
  onSelectProfile,
  onSubmit,
  onCancelAdd,
}: Props) {
  const showSearchHints = participantName.trim().length >= 2;

  return (
    <section>
      <h2 className="mb-1.5 font-display text-lg font-semibold">Players</h2>
      {unifiedPlayers.length === 0 ? (
        <p className="border-b py-3 text-sm text-muted-foreground">No players yet.</p>
      ) : (
        <PlayerRows
          unifiedPlayers={unifiedPlayers}
          scorerUserId={scorerUserId}
          currentUserId={currentUserId}
          isSubmitting={isSubmitting}
          onRemovePlayer={onRemovePlayer}
        />
      )}

      {isScorer && showAddForm ? (
        <form onSubmit={onSubmit} className="space-y-2 pt-3">
          <div className="overflow-hidden rounded-lg border bg-background">
            <Input
              value={participantName}
              onChange={(event) => onParticipantNameChange(event.target.value)}
              placeholder="Type a name"
              maxLength={80}
              autoFocus
              className="min-h-12 rounded-none border-0 bg-transparent px-3 text-base shadow-none focus-visible:ring-0"
              aria-label="Player name"
            />
            {showSearchHints && !selectedProfile ? (
              <div className="border-t">
                {isSearching ? (
                  <p className="px-3 py-2 text-[13px] text-muted-foreground">Searching…</p>
                ) : searchResults.length > 0 ? (
                  <ul>
                    {searchResults.map((profile) => (
                      <li key={profile.id} className="border-t first:border-t-0">
                        <button
                          type="button"
                          onClick={() => onSelectProfile(profile)}
                          className="min-h-11 w-full px-3 text-left text-[15px] font-semibold hover:bg-accent/60"
                        >
                          {profile.display_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-2 text-[13px] text-muted-foreground">
                    No account with that name — adds a guest.
                  </p>
                )}
              </div>
            ) : selectedProfile ? (
              <p className="border-t px-3 py-2 text-[13px] text-muted-foreground">
                Has an account — gets an invite.
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting} className="min-h-12 flex-1 text-[15px] font-semibold">
              {isSubmitting ? "Adding…" : "Add player"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-12 border-input shadow-none"
              onClick={onCancelAdd}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : isScorer ? (
        <>
          <button
            type="button"
            className="flex min-h-13 w-full items-center gap-2.5 border-b text-left text-base font-semibold text-primary"
            onClick={onShowAddForm}
            disabled={isSubmitting}
          >
            <Plus className="size-5" aria-hidden />
            Add another player
          </button>
          <p className="pt-2 text-[13px] text-muted-foreground">
            Players with an account get an invite. Others join as guests.
          </p>
        </>
      ) : null}
    </section>
  );
}
