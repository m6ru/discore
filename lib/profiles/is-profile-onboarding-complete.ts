export type ProfileOnboardingFields = {
  avatar_url: string | null;
  city: string | null;
};

/** Profile onboarding clears once the user adds a photo or city on Profile. */
export function isProfileOnboardingComplete(profile: ProfileOnboardingFields): boolean {
  return Boolean(profile.avatar_url?.trim() || profile.city?.trim());
}
