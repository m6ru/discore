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
      {/* Full screen height, not min-h-full: in the iPhone home-screen app a
          percentage height comes out one status bar short, and the forest body
          showed above the tab bar on short pages like Home. */}
      <div
        className={cn(
          "flex min-h-[calc(100dvh-env(safe-area-inset-top,0px))] flex-1 flex-col bg-background",
          tabBarPaddingClass(showTabs)
        )}
      >
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
