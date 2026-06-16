import type { FormEvent } from "react";
import type { ProfileSearchResult, UnifiedPlayer } from "../round-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";

const ROW_CLASS = "flex min-h-11 items-center gap-2 px-3 text-sm";

type PlayerRowsProps = {
  unifiedPlayers: UnifiedPlayer[];
  isSubmitting: boolean;
  onRemovePlayer: (player: UnifiedPlayer) => void;
};

function PlayerRows({ unifiedPlayers, isSubmitting, onRemovePlayer }: PlayerRowsProps) {
  if (unifiedPlayers.length === 0) {
    return null;
  }

  return (
    <>
      {unifiedPlayers.map((player, index) => (
        <div
          key={player.key}
          className={cn(ROW_CLASS, index > 0 && "border-t")}
        >
          <span className="min-w-0 flex-1 truncate font-medium">{player.label}</span>
          {player.isPending ? (
            <span className="shrink-0 text-xs text-muted-foreground">Pending</span>
          ) : null}
          {player.canRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 px-2 text-muted-foreground"
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

  if (isScorer && showAddForm) {
    return (
      <div className="space-y-2">
        <h3 className={sectionHeadingClassName}>Players</h3>
        <form onSubmit={onSubmit} className="space-y-2">
        <div className="overflow-hidden rounded-lg border">
          <PlayerRows
            unifiedPlayers={unifiedPlayers}
            isSubmitting={isSubmitting}
            onRemovePlayer={onRemovePlayer}
          />
          <div className={cn(unifiedPlayers.length > 0 && "border-t")}>
            <Input
              value={participantName}
              onChange={(event) => onParticipantNameChange(event.target.value)}
              placeholder="Type a name"
              maxLength={80}
              autoFocus
              className="min-h-11 rounded-none border-0 bg-transparent px-3 shadow-none focus-visible:ring-0"
              aria-label="Player name"
            />
            {showSearchHints && !selectedProfile ? (
              <div className="border-t">
                {isSearching ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Searching...</p>
                ) : searchResults.length > 0 ? (
                  <ul>
                    {searchResults.map((profile) => (
                      <li key={profile.id} className="border-t first:border-t-0">
                        <button
                          type="button"
                          onClick={() => onSelectProfile(profile)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
                        >
                          {profile.display_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    No registered match — will add as guest.
                  </p>
                )}
              </div>
            ) : selectedProfile ? (
              <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                Registered player selected.
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting} className="min-h-10 flex-1">
            {isSubmitting ? "Adding..." : "Add player"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-10"
            onClick={onCancelAdd}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className={sectionHeadingClassName}>Players</h3>
      <div className="overflow-hidden rounded-lg border">
      {unifiedPlayers.length === 0 ? (
        <p className="px-3 py-3 text-sm text-muted-foreground">No players yet.</p>
      ) : (
        <PlayerRows
          unifiedPlayers={unifiedPlayers}
          isSubmitting={isSubmitting}
          onRemovePlayer={onRemovePlayer}
        />
      )}
      {isScorer ? (
        <button
          type="button"
          className={cn(
            ROW_CLASS,
            "w-full text-muted-foreground hover:bg-muted/30",
            unifiedPlayers.length > 0 && "border-t"
          )}
          onClick={onShowAddForm}
          disabled={isSubmitting}
        >
          + Add another player
        </button>
      ) : null}
      </div>
    </div>
  );
}
