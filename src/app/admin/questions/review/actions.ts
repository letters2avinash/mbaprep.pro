"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { AccessDeniedError, requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { canTransition, isQuestionStatus, type QuestionStatus } from "@/lib/questions/status-transitions";

export type ReviewState = { message: string; ok?: boolean } | null;

// Moves one question to a new status. The server checks the admin role and the
// allowed move. The update only applies if the status is still the one the
// admin saw, so two admins can't overwrite each other.
export async function setQuestionStatus(_previous: ReviewState, formData: FormData): Promise<ReviewState> {
  try {
    const { userId } = await requireAdmin(["content", "academic"]);

    const questionId = String(formData.get("question_id") ?? "");
    const from = String(formData.get("from_status") ?? "");
    const to = String(formData.get("to_status") ?? "");

    if (!isQuestionStatus(from) || !isQuestionStatus(to)) {
      return { message: "That status is not valid." };
    }
    if (!canTransition(from, to)) {
      return { message: `A question cannot move from ${from} to ${to}.` };
    }

    const admin = createSupabaseAdminClient();
    const reviewer = to === "draft" ? null : userId;
    const { data, error } = await admin
      .from("questions")
      .update({ status: to satisfies QuestionStatus, reviewed_by: reviewer })
      .eq("id", questionId)
      .eq("status", from)
      .select("id");
    if (error) {
      throw error;
    }
    if (data.length === 0) {
      return { message: "This question changed while you were looking at it. Refresh and try again." };
    }

    revalidatePath("/admin/questions/review");
    return { message: `Question moved to ${to}.`, ok: true };
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { message: error.message };
    }
    Sentry.captureException(error, { tags: { area: "question-review" } });
    return { message: "The status could not be changed. Please try again." };
  }
}
