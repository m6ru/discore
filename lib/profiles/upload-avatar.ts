import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

const ALLOWED_TYPES = ["image/jpeg", "image/jpg"] as const;
const MAX_SIZE_BYTES = 1024 * 1024;

export async function uploadProfileAvatar(
  supabase: Client,
  userId: string,
  file: File
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    return { ok: false, message: "Only JPEG images are allowed." };
  }

  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, message: "Profile picture must be 1MB or smaller." };
  }

  const extension = file.name.toLowerCase().endsWith(".jpg") ? "jpg" : "jpeg";
  const path = `${userId}/avatar.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("profile-pictures")
    .upload(path, file, { upsert: true, contentType: "image/jpeg" });

  if (uploadError) {
    return { ok: false, message: `Upload failed: ${uploadError.message}` };
  }

  const { data } = supabase.storage.from("profile-pictures").getPublicUrl(path);
  return { ok: true, publicUrl: data.publicUrl };
}
