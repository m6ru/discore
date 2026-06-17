export type GetStartedItemId = "start-round" | "view-history" | "complete-profile";

export type GetStartedItem = {
  id: GetStartedItemId;
  label: string;
  href: string;
};

export const GET_STARTED_ITEMS: GetStartedItem[] = [
  {
    id: "start-round",
    label: "Start your first round",
    href: "/courses",
  },
  {
    id: "view-history",
    label: "Check history",
    href: "/rounds",
  },
  {
    id: "complete-profile",
    label: "Finish your profile",
    href: "/auth",
  },
];

export function getRemainingGetStartedItems(input: {
  hasJoinedRound: boolean;
  historyViewed: boolean;
  profileOnboardingComplete: boolean;
}): GetStartedItem[] {
  return GET_STARTED_ITEMS.filter((item) => {
    if (item.id === "start-round") {
      return !input.hasJoinedRound;
    }
    if (item.id === "view-history") {
      return !input.historyViewed;
    }
    if (item.id === "complete-profile") {
      return !input.profileOnboardingComplete;
    }
    return true;
  });
}
