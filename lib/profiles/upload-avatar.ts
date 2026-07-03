import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

// Accept common phone formats (iPhone HEIC, Android/web JPEG, screenshots PNG),
// then convert + downscale to a small JPEG before upload so storage/egress stay tiny.
export const AVATAR_MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const AVATAR_ACCEPT_ATTR =
  ".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif";
export const AVATAR_INVALID_TYPE_MESSAGE =
  "Only JPEG, PNG, or HEIC images are accepted (up to 10MB).";
export const AVATAR_TOO_LARGE_MESSAGE = "Image must be 10MB or smaller.";

const AVATAR_MAX_DIMENSION = 512;
const AVATAR_OUTPUT_QUALITY = 0.82;

type AvatarKind = "jpeg" | "png" | "heic";

function hasExtension(name: string, extensions: string[]): boolean {
  const lower = name.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
}

function detectAvatarKind(file: File): AvatarKind | null {
  const type = file.type.toLowerCase();
  if (type === "image/jpeg" || type === "image/jpg" || hasExtension(file.name, [".jpg", ".jpeg"])) {
    return "jpeg";
  }
  if (type === "image/png" || hasExtension(file.name, [".png"])) {
    return "png";
  }
  if (
    type === "image/heic" ||
    type === "image/heif" ||
    hasExtension(file.name, [".heic", ".heif"])
  ) {
    return "heic";
  }
  return null;
}

export function validateAvatarFile(file: File): { ok: true } | { ok: false; message: string } {
  if (detectAvatarKind(file) === null) {
    return { ok: false, message: AVATAR_INVALID_TYPE_MESSAGE };
  }
  if (file.size > AVATAR_MAX_INPUT_BYTES) {
    return { ok: false, message: AVATAR_TOO_LARGE_MESSAGE };
  }
  return { ok: true };
}

// Convert HEIC to JPEG (browsers can't decode HEIC on a canvas), then downscale
// to a square-ish thumbnail and re-encode as JPEG.
async function prepareAvatarBlob(file: File, kind: AvatarKind): Promise<Blob> {
  let sourceBlob: Blob = file;

  if (kind === "heic") {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: AVATAR_OUTPUT_QUALITY,
    });
    sourceBlob = Array.isArray(converted) ? converted[0] : converted;
  }

  const bitmap = await createImageBitmap(sourceBlob, { imageOrientation: "from-image" });
  const scale = Math.min(1, AVATAR_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not process image. Please try another photo.");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", AVATAR_OUTPUT_QUALITY)
  );
  if (!blob) {
    throw new Error("Could not process image. Please try another photo.");
  }
  return blob;
}

export async function uploadProfileAvatar(
  supabase: Client,
  userId: string,
  file: File
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  const kind = detectAvatarKind(file);
  if (kind === null) {
    return { ok: false, message: AVATAR_INVALID_TYPE_MESSAGE };
  }
  if (file.size > AVATAR_MAX_INPUT_BYTES) {
    return { ok: false, message: AVATAR_TOO_LARGE_MESSAGE };
  }

  let blob: Blob;
  try {
    blob = await prepareAvatarBlob(file, kind);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not process image.";
    return { ok: false, message };
  }

  const path = `${userId}/avatar.jpeg`;
  const { error: uploadError } = await supabase.storage
    .from("profile-pictures")
    .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

  if (uploadError) {
    return { ok: false, message: `Upload failed: ${uploadError.message}` };
  }

  const { data } = supabase.storage.from("profile-pictures").getPublicUrl(path);
  // The storage path is stable (upsert), so bust the CDN/browser cache to show the new photo.
  return { ok: true, publicUrl: `${data.publicUrl}?v=${Date.now()}` };
}
