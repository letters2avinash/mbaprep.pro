"use client";

import { useActionState } from "react";
import { setQuestionStatus, type ReviewState } from "./actions";
import type { QuestionStatus } from "@/lib/questions/status-transitions";

const NEXT_STEPS: Record<QuestionStatus, { to: QuestionStatus; label: string }[]> = {
  draft: [{ to: "reviewed", label: "Mark reviewed" }],
  reviewed: [
    { to: "published", label: "Publish" },
    { to: "draft", label: "Send back to draft" },
  ],
  published: [{ to: "reviewed", label: "Unpublish" }],
};

export function StatusForm({ questionId, status }: { questionId: string; status: QuestionStatus }) {
  const [state, formAction, pending] = useActionState<ReviewState, FormData>(setQuestionStatus, null);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        {NEXT_STEPS[status].map((step) => (
          <form key={step.to} action={formAction}>
            <input type="hidden" name="question_id" value={questionId} />
            <input type="hidden" name="from_status" value={status} />
            <input type="hidden" name="to_status" value={step.to} />
            <button type="submit" disabled={pending} className="rounded border px-3 py-1 text-sm disabled:opacity-50">
              {step.label}
            </button>
          </form>
        ))}
      </div>
      {state?.message && (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-green-700" : "text-sm text-red-700"}>
          {state.message}
        </p>
      )}
    </div>
  );
}
