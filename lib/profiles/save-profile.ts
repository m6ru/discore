import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { buildDisplayName } from "@/lib/profiles/format-display-name";
import { uploadProfileAvatar } from "@/lib/profiles/upload-avatar";

type Client = SupabaseClient<Database>;

export type ProfileFormInput = {
  firstName: string;
  lastName: string;
  gender: string;
  birthYear: string;
  city: string;
  existingAvatarUrl: string;
};

export type SaveProfileResult =
  | { ok: true; avatarUrl: string | null }
  | { ok: false; message: string };

function parseBirthYear(raw: string): { ok: true; value: number | null } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1900) {
    return { ok: false, message: "Birth year must be a valid year." };
  }
  return { ok: true, value: parsed };
}

export async function saveProfile(
  supabase: Client,
  userId: string,
  email: string,
  input: ProfileFormInput,
  avatarFile: File | null
): Promise<SaveProfileResult> {
  const birthYearResult = parseBirthYear(input.birthYear);
  if (!birthYearResult.ok) {
    return { ok: false, message: birthYearResult.message };
  }

  let nextAvatarUrl: string | null = input.existingAvatarUrl.trim() || null;

  if (avatarFile && avatarFile.size > 0) {
    const uploadResult = await uploadProfileAvatar(supabase, userId, avatarFile);
    if (!uploadResult.ok) {
      return { ok: false, message: uploadResult.message };
    }
    nextAvatarUrl = uploadResult.publicUrl;
  }

  const displayName = buildDisplayName(input.firstName, input.lastName, email);

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      display_name: displayName,
      gender: input.gender || null,
      birth_year: birthYearResult.value,
      city: input.city.trim() || null,
      avatar_url: nextAvatarUrl,
    })
    .eq("id", userId);

  if (error) {
    return { ok: false, message: `Save failed: ${error.message}` };
  }

  return { ok: true, avatarUrl: nextAvatarUrl };
}
