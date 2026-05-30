"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CirclePlay, Home, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";

type TabItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
  emphasized?: boolean;
};

const TABS: TabItem[] = [
  {
    href: "/",
    label: "Home",
    icon: Home,
    isActive: (pathname) => pathname === "/",
  },
  {
    href: "/courses",
    label: "Courses",
    icon: MapPin,
    isActive: (pathname) =>
      pathname === "/courses" || pathname.startsWith("/courses/"),
  },
  {
    href: "/courses",
    label: "Start round",
    icon: CirclePlay,
    isActive: (pathname) => pathname === "/courses",
    emphasized: true,
  },
  {
    href: "/auth",
    label: "Account",
    icon: User,
    isActive: (pathname) => pathname === "/auth" || pathname.startsWith("/auth/"),
  },
];

export function shouldShowTabBar(pathname: string): boolean {
  if (pathname.startsWith("/rounds/") && pathname !== "/rounds/new") {
    return false;
  }
  return true;
}

export function tabBarPaddingClass(show: boolean): string {
  return show
    ? "pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]"
    : "";
}

export function BottomTabBar() {
  const pathname = usePathname();

  if (!shouldShowTabBar(pathname)) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Main navigation"
    >
      <ul className="mx-auto flex h-[4.5rem] max-w-2xl items-stretch px-2">
        {TABS.map((tab) => {
          const active = tab.isActive(pathname);
          const Icon = tab.icon;

          return (
            <li key={tab.label} className="flex min-w-0 flex-1">
              <Link
                href={tab.href}
                className={cn(
                  "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-medium transition-colors",
                  active
                    ? tab.emphasized
                      ? "text-primary"
                      : "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                  tab.emphasized && active && "font-semibold"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0",
                    tab.emphasized && "size-6",
                    active && tab.emphasized && "fill-primary/15"
                  )}
                  aria-hidden
                />
                <span className="truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
