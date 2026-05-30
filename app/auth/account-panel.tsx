"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { saveProfile } from "@/lib/profiles/save-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
        setStatus(result.message);
        return;
      }

      setAvatarUrl(result.avatarUrl ?? "");
      setPendingAvatarFile(null);
      setStatus("Profile updated.");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setStatus(message);
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
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="break-all text-sm font-medium">{email}</p>
      </div>

      <Separator />

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
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} disabled />
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

        <div className="space-y-2">
          <Label htmlFor="avatar">Profile picture (JPEG, max 1MB)</Label>
          <Input
            id="avatar"
            type="file"
            accept=".jpg,.jpeg,image/jpeg"
            className="py-1.5"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setPendingAvatarFile(file && file.size > 0 ? file : null);
            }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Please wait..." : "Save profile"}
          </Button>
          <Button type="button" variant="outline" onClick={() => void onSignOut()} disabled={isLoading}>
            Sign out
          </Button>
        </div>
      </form>

      {status ? (
        <p className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">{status}</p>
      ) : null}

      <Separator />

      <form onSubmit={onChangePassword} className="space-y-4">
        <h3 className="text-sm font-semibold">Change password</h3>
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
        <Button type="submit" disabled={isChangingPassword}>
          {isChangingPassword ? "Please wait..." : "Change password"}
        </Button>
      </form>

      {passwordStatus ? (
        <p className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">{passwordStatus}</p>
      ) : null}
    </>
  );
}
