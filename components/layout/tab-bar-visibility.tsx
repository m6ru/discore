"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { shouldShowTabBar } from "./bottom-tab-bar";

type TabBarVisibilityContextValue = {
  override: boolean | null;
  setOverride: (value: boolean | null) => void;
};

const TabBarVisibilityContext = createContext<TabBarVisibilityContextValue | null>(
  null
);

export function TabBarVisibilityProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<boolean | null>(null);
  const value = useMemo(
    () => ({ override, setOverride }),
    [override]
  );

  return (
    <TabBarVisibilityContext.Provider value={value}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

/** Round pages call this to show the tab bar for observers and completed rounds. */
export function useTabBarVisibilityOverride(show: boolean) {
  const ctx = useContext(TabBarVisibilityContext);

  useEffect(() => {
    if (!ctx) {
      return;
    }
    ctx.setOverride(show);
    return () => ctx.setOverride(null);
  }, [ctx, show]);
}

export function useTabBarVisible(pathname: string): boolean {
  const ctx = useContext(TabBarVisibilityContext);
  if (ctx && ctx.override !== null) {
    return ctx.override;
  }
  return shouldShowTabBar(pathname);
}
