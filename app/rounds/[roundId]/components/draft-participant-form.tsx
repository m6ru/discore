import type { FormEvent } from "react";
import type { ProfileSearchResult } from "../round-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  participantName: string;
  isSubmitting: boolean;
  isSearching: boolean;
  searchResults: ProfileSearchResult[];
  selectedProfile: ProfileSearchResult | null;
  onParticipantNameChange: (value: string) => void;
  onSelectProfile: (profile: ProfileSearchResult) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function DraftParticipantForm({
  participantName,
  isSubmitting,
  isSearching,
  searchResults,
  selectedProfile,
  onParticipantNameChange,
  onSelectProfile,
  onSubmit,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <Label htmlFor="participant-name">Player name</Label>
        <Input
          id="participant-name"
          value={participantName}
          onChange={(event) => onParticipantNameChange(event.target.value)}
          placeholder="Type player name"
          maxLength={80}
        />
        {participantName.trim().length >= 2 ? (
          <div className="rounded-lg border bg-card">
            {isSearching ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">Searching...</p>
            ) : searchResults.length > 0 ? (
              <ul className="max-h-40 overflow-auto">
                {searchResults.map((profile) => (
                  <li key={profile.id} className="border-b last:border-b-0">
                    <button
                      type="button"
                      onClick={() => onSelectProfile(profile)}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm hover:bg-muted/50",
                        selectedProfile?.id === profile.id && "bg-muted"
                      )}
                    >
                      {profile.display_name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No registered match, will add as guest.
              </p>
            )}
          </div>
        ) : null}
      </div>
      <Button type="submit" disabled={isSubmitting} className="shrink-0">
        {isSubmitting ? "Adding..." : "Add player"}
      </Button>
    </form>
  );
}
