import type { FormEvent } from "react";
import type { ProfileSearchResult } from "../round-types";

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
      <label className="flex-1 space-y-1 text-sm">
        <span>Player name</span>
        <input
          value={participantName}
          onChange={(event) => onParticipantNameChange(event.target.value)}
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
                      onClick={() => onSelectProfile(profile)}
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
  );
}
