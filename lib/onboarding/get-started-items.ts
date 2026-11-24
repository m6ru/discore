export type GetStartedItemId = "add-to-home-screen" | "complete-profile";

export type GetStartedItem = {
  id: GetStartedItemId;
  label: string;
  /** No href: the row opens the install dialog or the steps sheet instead. */
  href?: string;
};

export const GET_STARTED_ITEMS: GetStartedItem[] = [
  {
    id: "add-to-home-screen",
    label: "Add discbook to your home screen",
  },
  {
    id: "complete-profile",
    label: "Finish your profile",
    href: "/auth",
  },
];

export function getRemainingGetStartedItems(input: {
  /** A phone that hasn't opened discbook from the home screen. */
  canAddToHomeScreen: boolean;
  profileOnboardingComplete: boolean;
}): GetStartedItem[] {
  return GET_STARTED_ITEMS.filter((item) => {
    if (item.id === "add-to-home-screen") {
      return input.canAddToHomeScreen;
    }
    if (item.id === "complete-profile") {
      return !input.profileOnboardingComplete;
    }
    return true;
  });
}
