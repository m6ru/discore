"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BottomTabBar, shouldShowTabBar, tabBarPaddingClass } from "./bottom-tab-bar";

type Props = {
  children: React.ReactNode;
};

export function AppChrome({ children }: Props) {
  const pathname = usePathname();
  const showTabs = shouldShowTabBar(pathname);

  return (
    <>
      <div className={cn("flex min-h-full flex-1 flex-col", tabBarPaddingClass(showTabs))}>
        {children}
      </div>
      <BottomTabBar />
    </>
  );
}
