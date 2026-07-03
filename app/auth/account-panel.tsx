"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getNearbyCoursesPreference,
  setNearbyCoursesPreference,
} from "@/lib/courses/nearby-courses";
import { createClient } from "@/lib/supabase/client";
import { saveProfile } from "@/lib/profiles/save-profile";
import { AVATAR_ACCEPT_ATTR, validateAvatarFile } from "@/lib/profiles/upload-avatar";
import { toastError, toastSuccess } from "@/lib/ui/toast-notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Props = {
  email: string;
  displayName: string;
  initialFirstName: string;
  initialLastName: string;
  initialGender: string;
  initialBirthYear: string;
  initialCity: string;
  initialAvatarUrl: string;
};

function profileInitials(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  const combined = `${first}${last}`.toUpperCase();
  return combined || "?";
}

export function AccountPanel({
  email,
  displayName,
  initialFirstName,
  initialLastName,
  initialGender,
  initialBirthYear,
  initialCity,
  initialAvatarUrl,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const avatarInputId = useId();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [gender, setGender] = useState(initialGender);
  const [birthYear, setBirthYear] = useState(initialBirthYear);
  const [city, setCity] = useState(initialCity);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [nearbyCourses, setNearbyCourses] = useState(
    () => getNearbyCoursesPreference() === "enabled"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const avatarPreviewUrl = useMemo(() => {
    if (pendingAvatarFile === null) {
      return null;
    }
    return URL.createObjectURL(pendingAvatarFile);
  }, [pendingAvatarFile]);

  const heroAvatarSrc = avatarPreviewUrl ?? (avatarUrl.trim() || null);
  const heroInitials = profileInitials(firstName, lastName);

  useEffect(() => {
    if (avatarPreviewUrl === null) {
      return;
    }
    return () => URL.revokeObjectURL(avatarPreviewUrl);
  }, [avatarPreviewUrl]);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toastError("Session expired. Please sign in again.");
        router.push("/auth");
        router.refresh();
        return;
      }

      const result = await saveProfile(
        supabase,
        user.id,
        email,
        {
          firstName,
          lastName,
          gender,
          birthYear,
          city,
          existingAvatarUrl: avatarUrl,
        },
        pendingAvatarFile
      );

      if (!result.ok) {
        toastError(result.message);
        return;
      }

      setAvatarUrl(result.avatarUrl ?? "");
      setPendingAvatarFile(null);
      toastSuccess("Profile updated.");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toastError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function onChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword.length < 6) {
      toastError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toastError("Passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toastError(`Password change failed: ${error.message}`);
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      toastSuccess("Password updated.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function onSignOut() {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toastError(error.message);
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted",
            !heroAvatarSrc && "text-lg font-semibold text-muted-foreground"
          )}
          aria-hidden={Boolean(heroAvatarSrc)}
        >
          {heroAvatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase storage URLs; no next/image remote config
            <img src={heroAvatarSrc} alt="" className="size-full object-cover" />
          ) : (
            heroInitials
          )}
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-lg font-semibold tracking-tight">{displayName}</p>
          {city.trim() ? (
            <p className="truncate text-sm text-muted-foreground">{city.trim()}</p>
          ) : null}
          <p className="truncate text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      <input
        id={avatarInputId}
        type="file"
        accept={AVATAR_ACCEPT_ATTR}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file || file.size === 0) {
            setPendingAvatarFile(null);
            return;
          }
          const validation = validateAvatarFile(file);
          if (!validation.ok) {
            toastError(validation.message);
            setPendingAvatarFile(null);
            event.target.value = "";
            return;
          }
          setPendingAvatarFile(file);
        }}
      />

      <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="first-name">First name</Label>
            <Input
              id="first-name"
              type="text"
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              maxLength={80}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last-name">Last name</Label>
            <Input
              id="last-name"
              type="text"
              required
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              maxLength={80}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger id="gender" className="w-full">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth-year">Year of birth</Label>
            <Input
              id="birth-year"
              type="number"
              inputMode="numeric"
              min={1900}
              max={3000}
              value={birthYear}
              onChange={(event) => setBirthYear(event.target.value)}
              placeholder="e.g. 1994"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              maxLength={120}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button type="button" variant="outline" size="sm" asChild>
              <label htmlFor={avatarInputId} className="cursor-pointer">
                {avatarUrl.trim() ? "Change photo" : "Add photo"}
              </label>
            </Button>
            {pendingAvatarFile ? (
              <p className="text-xs text-muted-foreground">
                {pendingAvatarFile.name} — save to upload
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">JPEG, PNG or HEIC · up to 10MB</p>
            )}
          </div>

          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? "Please wait..." : "Save profile"}
          </Button>
        </form>

      <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="location-services">Location services</Label>
            <p className="text-sm text-muted-foreground">
              Enable to display distances.
            </p>
          </div>
          <Switch
            id="location-services"
            checked={nearbyCourses}
            onCheckedChange={(checked) => {
              setNearbyCourses(checked);
              setNearbyCoursesPreference(checked ? "enabled" : "disabled");
            }}
            aria-label="Location services — enable to display distances"
          />
      </div>

      <form onSubmit={onChangePassword} className="space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary" disabled={isChangingPassword}>
            {isChangingPassword ? "Please wait..." : "Change password"}
          </Button>
      </form>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => void onSignOut()}
        disabled={isLoading}
      >
        Sign out
      </Button>
    </div>
  );
}
