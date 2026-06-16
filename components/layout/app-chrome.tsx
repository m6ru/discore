"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BottomTabBar, tabBarPaddingClass } from "./bottom-tab-bar";
import {
  TabBarVisibilityProvider,
  useTabBarVisible,
} from "./tab-bar-visibility";

function AppChromeInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showTabs = useTabBarVisible(pathname);

  return (
    <>
      <div className={cn("flex min-h-full flex-1 flex-col", tabBarPaddingClass(showTabs))}>
        {children}
      </div>
      <BottomTabBar show={showTabs} />
    </>
  );
}

type Props = {
  children: React.ReactNode;
};

export function AppChrome({ children }: Props) {
  return (
    <TabBarVisibilityProvider>
      <AppChromeInner>{children}</AppChromeInner>
    </TabBarVisibilityProvider>
  );
}
