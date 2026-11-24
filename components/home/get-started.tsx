"use client";

import Link from "next/link";
import { ChevronRight, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getRemainingGetStartedItems } from "@/lib/onboarding/get-started-items";
import {
  homeScreenPlatform,
  isOpenedFromHomeScreen,
  type HomeScreenPlatform,
} from "@/lib/onboarding/home-screen";
import {
  homeRowLinkClassName,
  homeRowTitleClassName,
} from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";

/** Chromium's install event; not in the DOM typings. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Props = {
  profileOnboardingComplete: boolean;
};

export function HomeGetStarted({ profileOnboardingComplete }: Props) {
  // null until mounted: the server can't know the phone, so the row appears after hydration.
  const [platform, setPlatform] = useState<HomeScreenPlatform | null>(null);
  const [fromHomeScreen, setFromHomeScreen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [stepsOpen, setStepsOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the device after mount
    setPlatform(homeScreenPlatform(navigator.userAgent, navigator.maxTouchPoints));
    setFromHomeScreen(isOpenedFromHomeScreen());

    const onInstallPrompt = (event: Event) => {
      // Keep the browser's own banner back; the row opens it on tap.
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setFromHomeScreen(true);

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const remaining = getRemainingGetStartedItems({
    canAddToHomeScreen: platform !== null && platform !== "desktop" && !fromHomeScreen,
    profileOnboardingComplete,
  });

  if (remaining.length === 0) {
    return null;
  }

  async function onAddToHomeScreen() {
    if (!installPrompt) {
      setStepsOpen(true);
      return;
    }
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    // The event works once; a dismissed dialog falls back to the steps next time.
    setInstallPrompt(null);
    if (outcome === "accepted") {
      setFromHomeScreen(true);
    }
  }

  return (
    <section className="space-y-2">
      <h2 className={sectionHeadingClassName}>Get started</h2>
      <ul>
        {remaining.map((item) => (
          <li key={item.id}>
            {item.href ? (
              <Link href={item.href} className={homeRowLinkClassName}>
                <span className={homeRowTitleClassName}>{item.label}</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => void onAddToHomeScreen()}
                className={`${homeRowLinkClassName} w-full text-left`}
              >
                <span className={homeRowTitleClassName}>{item.label}</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>
      {platform && platform !== "desktop" ? (
        <HomeScreenStepsSheet platform={platform} open={stepsOpen} onOpenChange={setStepsOpen} />
      ) : null}
    </section>
  );
}

const STEPS: Record<Exclude<HomeScreenPlatform, "desktop">, React.ReactNode[]> = {
  ios: [
    <>
      Tap ⋯ or <Share className="inline size-[18px] -translate-y-px" aria-label="Share" /> in the browser bar
    </>,
    "Choose Add to Home Screen",
    "Tap Add",
  ],
  android: ["Tap ⋮ (the browser menu)", "Choose Add to Home screen or Install app", "Tap Install"],
  "android-firefox": ["Tap ⋮ (the browser menu)", "Choose Install or Add to Home screen", "Confirm"],
};

function HomeScreenStepsSheet({
  platform,
  open,
  onOpenChange,
}: {
  platform: Exclude<HomeScreenPlatform, "desktop">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Same bottom sheet as the round sheet (round-sheet.tsx). */}
      <DialogContent
        showCloseButton={false}
        className="top-auto bottom-0 left-0 max-w-none translate-x-0 translate-y-0 gap-0 rounded-t-xl rounded-b-none border-x-0 border-b-0 px-5 pt-2 shadow-none data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <span className="mx-auto h-1 w-9 rounded-full bg-input" aria-hidden />
        <div className="flex items-start gap-3 border-b pt-4 pb-3.5">
          <div className="min-w-0 flex-1 space-y-1">
            <DialogTitle className="font-display text-[22px] font-semibold tracking-tight">
              Add to your home screen
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Opens like an app, full screen.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-mt-2 -mr-2.5 size-11 shrink-0"
              aria-label="Close"
            >
              <X className="size-[22px]" aria-hidden />
            </Button>
          </DialogClose>
        </div>
        <ol>
          {STEPS[platform].map((step, index) => (
            <li key={index} className="flex min-h-13 items-center gap-3.5 border-b">
              <span className="w-4 font-mono text-sm text-muted-foreground">{index + 1}</span>
              <span className="text-base font-semibold">{step}</span>
            </li>
          ))}
        </ol>
        <p className="pt-3.5 text-[13px] leading-relaxed text-muted-foreground">
          Don&apos;t see it? Look for <span className="font-semibold text-foreground">Add to Home screen</span> or{" "}
          <span className="font-semibold text-foreground">Install app</span> in your browser&apos;s menu.
          {platform === "ios" ? " You'll sign in once more in the home-screen app." : ""}
        </p>
      </DialogContent>
    </Dialog>
  );
}
