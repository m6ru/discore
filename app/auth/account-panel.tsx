"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import {
  getNearbyCoursesPreference,
  setNearbyCoursesPreference,
} from "@/lib/courses/nearby-courses";
import {
  getPostRoundInsightsPreference,
  setPostRoundInsightsPreference,
} from "@/lib/rounds/post-round-insights-preference";
import { isCleanCardDefault, setCleanCardDefault } from "@/lib/rounds/clean-card-preference";
import { pagePrimaryButtonClassName } from "@/lib/ui/page-chrome";
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

export type AccountView = "menu" | "edit" | "password";

type Props = {
  view: AccountView;
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
  view,
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
  const [postRoundInsights, setPostRoundInsights] = useState(
    () => getPostRoundInsightsPreference() !== "disabled"
  );
  const [cleanCard, setCleanCard] = useState(() => isCleanCardDefault());
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
      router.push("/auth");
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
      router.push("/auth");
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

  const avatar = (
    <div
      className={cn(
        "relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md",
        heroAvatarSrc ? "border bg-muted" : "bg-primary font-display text-2xl font-semibold text-primary-foreground"
      )}
      aria-hidden
    >
      {heroAvatarSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- Supabase storage URLs; no next/image remote config
        <img src={heroAvatarSrc} alt="" className="size-full object-cover" />
      ) : (
        heroInitials
      )}
    </div>
  );

  if (view === "edit") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          {avatar}
          <div className="flex flex-col gap-1">
            <Button type="button" variant="outline" size="sm" asChild>
              <label htmlFor={avatarInputId} className="cursor-pointer">
                {avatarUrl.trim() ? "Change photo" : "Add photo"}
              </label>
            </Button>
            <p className="text-xs text-muted-foreground">
              {pendingAvatarFile ? `${pendingAvatarFile.name} — save to upload` : "JPEG, PNG or HEIC · up to 10MB"}
            </p>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                type="text"
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                maxLength={80}
                className={fieldClassName}
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
                className={fieldClassName}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              maxLength={120}
              className={fieldClassName}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="gender" className="h-12 w-full">
                  <SelectValue placeholder="Select" />
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
                className={fieldClassName}
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className={pagePrimaryButtonClassName}>
            {isLoading ? "Please wait..." : "Save profile"}
          </Button>
        </form>
      </div>
    );
  }

  if (view === "password") {
    return (
      <form onSubmit={onChangePassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            className={fieldClassName}
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
            autoComplete="new-password"
            className={fieldClassName}
          />
        </div>
        <Button type="submit" disabled={isChangingPassword} className={pagePrimaryButtonClassName}>
          {isChangingPassword ? "Please wait..." : "Change password"}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3.5">
        {avatar}
        <div className="min-w-0 space-y-0.5">
          <p className="truncate font-display text-[22px] font-semibold leading-tight">{displayName}</p>
          <p className="truncate text-sm text-muted-foreground">
            {[city.trim(), email].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <section>
        <h2 className={listHeadingClassName}>Account</h2>
        <Link href="/auth?view=edit" className={rowClassName}>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold">Edit profile</span>
            <span className="block text-[13px] text-muted-foreground">
              Name, photo, city, gender, year of birth
            </span>
          </span>
          <ChevronRight className="size-[18px] shrink-0 text-muted-foreground" aria-hidden />
        </Link>
        <Link href="/auth?view=password" className={rowClassName}>
          <span className="flex-1 text-base font-semibold">Change password</span>
          <ChevronRight className="size-[18px] shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      </section>

      <section>
        <h2 className={listHeadingClassName}>Settings</h2>
        <SettingRow
          id="location-services"
          title="Location"
          hint="Nearest course on Home, distances in the list"
          checked={nearbyCourses}
          onCheckedChange={(checked) => {
            setNearbyCourses(checked);
            setNearbyCoursesPreference(checked ? "enabled" : "disabled");
          }}
        />
        <SettingRow
          id="post-round-insights"
          title="Your round summary"
          hint="New best, where it went, after each round"
          checked={postRoundInsights}
          onCheckedChange={(checked) => {
            setPostRoundInsights(checked);
            setPostRoundInsightsPreference(checked ? "enabled" : "disabled");
          }}
        />
        <SettingRow
          id="clean-card-default"
          title="Clean card by default"
          hint="Start rounds without totals or your hole history"
          checked={cleanCard}
          onCheckedChange={(checked) => {
            setCleanCard(checked);
            setCleanCardDefault(checked);
          }}
        />
      </section>

      <Button
        type="button"
        variant="outline"
        onClick={() => void onSignOut()}
        disabled={isLoading}
        className={cn(pagePrimaryButtonClassName, "border-destructive text-destructive hover:bg-destructive/5 hover:text-destructive")}
      >
        Sign out
      </Button>
    </div>
  );
}

const fieldClassName = "h-12 text-base";
const listHeadingClassName = "border-b border-foreground pb-1.5 font-display text-lg font-semibold";
const rowClassName =
  "flex min-h-14 items-center gap-3 border-b py-2.5 transition-colors hover:bg-accent/50";

function SettingRow({
  id,
  title,
  hint,
  checked,
  onCheckedChange,
}: {
  id: string;
  title: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className={cn(rowClassName, "min-h-16 cursor-pointer")}>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold">{title}</span>
        <span className="block text-[13px] text-muted-foreground">{hint}</span>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}
