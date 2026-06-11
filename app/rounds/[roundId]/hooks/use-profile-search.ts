"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { RoundStatus } from "@/lib/rounds/round-status";
import { toastError } from "@/lib/ui/toast-notify";
import type { ProfileSearchResult } from "../round-types";

type Client = SupabaseClient<Database>;

type Options = {
  supabase: Client;
  roundStatus: RoundStatus;
  currentUserId: string;
  participantName: string;
};

export function useProfileSearch({
  supabase,
  roundStatus,
  currentUserId,
  participantName,
}: Options) {
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileSearchResult | null>(null);

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
        toastError(`Participant lookup failed: ${error.message}`);
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

  function clearSearchSelection() {
    setSelectedProfile(null);
    setSearchResults([]);
  }

  function selectProfile(profile: ProfileSearchResult) {
    setSelectedProfile(profile);
  }

  return {
    searchResults,
    isSearching,
    selectedProfile,
    setSelectedProfile,
    clearSearchSelection,
    selectProfile,
  };
}
