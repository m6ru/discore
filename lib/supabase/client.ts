"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type DiscoreClient = SupabaseClient<Database>;

let browserClient: DiscoreClient | undefined;

export function createClient(): DiscoreClient {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    },
  );

  return browserClient;
}
