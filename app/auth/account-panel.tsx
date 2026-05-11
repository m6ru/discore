"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  email: string;
  initialFirstName: string;
  initialLastName: string;
  initialGender: string;
  initialBirthYear: string;
  initialCity: string;
  initialAvatarUrl: string;
};

export function AccountPanel({
  email,
  initialFirstName,
  initialLastName,
  initialGender,
  initialBirthYear,
  initialCity,
  initialAvatarUrl,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [gender, setGender] = useState(initialGender);
  const [birthYear, setBirthYear] = useState(initialBirthYear);
  const [city, setCity] = useState(initialCity);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [status, setStatus] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function uploadAvatar(userId: string, file: File): Promise<string> {
    if (!["image/jpeg", "image/jpg"].includes(file.type)) {
      throw new Error("Only JPEG images are allowed.");
    }

    const maxSizeBytes = 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new Error("Profile picture must be 1MB or smaller.");
    }

    const extension = file.name.toLowerCase().endsWith(".jpg") ? "jpg" : "jpeg";
    const path = `${userId}/avatar.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("profile-pictures")
      .upload(path, file, { upsert: true, contentType: "image/jpeg" });
    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from("profile-pictures").getPublicUrl(path);
    return data.publicUrl;
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setStatus(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus("Session expired. Please sign in again.");
        router.push("/auth");
        router.refresh();
        return;
      }

      const parsedBirthYear = birthYear.trim() ? Number(birthYear.trim()) : null;
      if (parsedBirthYear !== null && (!Number.isInteger(parsedBirthYear) || parsedBirthYear < 1900)) {
        setStatus("Birth year must be a valid year.");
        return;
      }

      let nextAvatarUrl: string | null = avatarUrl.trim() || null;
      const formData = new FormData(event.currentTarget);
      const avatarFile = formData.get("avatar_file");
      if (avatarFile instanceof File && avatarFile.size > 0) {
        nextAvatarUrl = await uploadAvatar(user.id, avatarFile);
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          display_name: fullName || email,
          gender: gender || null,
          birth_year: parsedBirthYear,
          city: city.trim() || null,
          avatar_url: nextAvatarUrl,
        })
        .eq("id", user.id);

      if (error) {
        setStatus(`Save failed: ${error.message}`);
        return;
      }

      setAvatarUrl(nextAvatarUrl ?? "");
      setStatus("Profile updated.");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  async function onChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 6) {
      setPasswordStatus("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus("Passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordStatus(`Password change failed: ${error.message}`);
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus("Password updated.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function onSignOut() {
    setIsLoading(true);
    setStatus(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setStatus(error.message);
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <section className="rounded-lg border border-zinc-200 p-4">
        <p className="text-sm text-zinc-600">Signed in as</p>
        <p className="mt-1 break-all text-sm font-medium">{email}</p>
      </section>

      <form onSubmit={onSave} className="space-y-4 rounded-lg border border-zinc-200 p-4">
        <label className="block space-y-1 text-sm">
          <span>First name</span>
          <input
            type="text"
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2"
            maxLength={80}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Last name</span>
          <input
            type="text"
            required
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2"
            maxLength={80}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Email</span>
          <input
            type="email"
            value={email}
            disabled
            className="w-full rounded border border-zinc-300 bg-zinc-100 px-3 py-2 text-zinc-600"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Gender</span>
          <select
            value={gender}
            onChange={(event) => setGender(event.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2"
          >
            <option value="">Select gender</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span>Year of birth</span>
          <input
            type="number"
            inputMode="numeric"
            min={1900}
            max={3000}
            value={birthYear}
            onChange={(event) => setBirthYear(event.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2"
            placeholder="e.g. 1994"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>City</span>
          <input
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2"
            maxLength={120}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Profile picture (JPEG, max 1MB)</span>
          <input
            type="file"
            name="avatar_file"
            accept=".jpg,.jpeg,image/jpeg"
            className="w-full rounded border border-zinc-300 px-3 py-2"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isLoading ? "Please wait..." : "Save profile"}
          </button>
          <button
            type="button"
            onClick={() => void onSignOut()}
            disabled={isLoading}
            className="rounded border border-zinc-300 px-4 py-2 text-sm"
          >
            Sign out
          </button>
        </div>
      </form>

      {status ? (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">{status}</p>
      ) : null}

      <form onSubmit={onChangePassword} className="space-y-4 rounded-lg border border-zinc-200 p-4">
        <h3 className="text-sm font-semibold text-zinc-800">Change password</h3>
        <label className="block space-y-1 text-sm">
          <span>New password</span>
          <input
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Confirm new password</span>
          <input
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={isChangingPassword}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isChangingPassword ? "Please wait..." : "Change password"}
        </button>
      </form>

      {passwordStatus ? (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">{passwordStatus}</p>
      ) : null}
    </>
  );
}
