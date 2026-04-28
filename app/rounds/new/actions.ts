"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { generateJoinCode } from "@/lib/rounds/join-code";

const MAX_JOIN_CODE_RETRIES = 5;

type CreateRoundResult = {
  id: string;
  join_code: string;
};

export async function createRoundAction(formData: FormData) {
  const layoutId = formData.get("layout_id");

  if (typeof layoutId !== "string" || layoutId.trim().length === 0) {
    redirect("/rounds/new?error=Missing+layout+selection");
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?message=Please+sign+in+to+create+a+round");
  }

  let createdRound: CreateRoundResult | null = null;

  for (let attempt = 0; attempt < MAX_JOIN_CODE_RETRIES; attempt += 1) {
    const joinCode = generateJoinCode();
    const { data, error } = await supabase
      .from("rounds")
      .insert({
        layout_id: layoutId,
        scorer_id: user.id,
        join_code: joinCode,
      })
      .select("id, join_code")
      .single<CreateRoundResult>();

    if (!error) {
      createdRound = data;
      break;
    }

    if (error.code !== "23505") {
      redirect(`/rounds/new?error=${encodeURIComponent(error.message)}`);
    }
  }

  if (!createdRound) {
    redirect("/rounds/new?error=Could+not+generate+a+unique+join+code");
  }

  redirect(`/rounds/new?created=1&roundId=${createdRound.id}&joinCode=${createdRound.join_code}`);
}
