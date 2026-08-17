import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { TrialSession } from "./trial-session";

export default async function TrialRoundPage() {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/");
  }

  return <TrialSession />;
}
