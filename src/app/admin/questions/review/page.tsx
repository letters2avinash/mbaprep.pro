import { Suspense } from "react";
import { AccessDeniedError, requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { type QuestionStatus } from "@/lib/questions/status-transitions";
import { StatusForm } from "./status-form";

const LIST_LIMIT = 200;

export default function QuestionReviewPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Review questions</h1>
        <p className="text-zinc-600">
          Drafts move to reviewed, then to published. Only published questions reach students. The latest {LIST_LIMIT}
          questions are listed, newest first.
        </p>
      </header>
      <Suspense fallback={<p className="text-zinc-600">Checking access...</p>}>
        <ReviewList />
      </Suspense>
    </main>
  );
}

async function ReviewList() {
  try {
    await requireAdmin(["content", "academic"]);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return (
        <div>
          <h2 className="text-xl font-semibold">Access denied</h2>
          <p className="mt-2 text-zinc-600">{error.message}</p>
        </div>
      );
    }
    throw error;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("questions")
    .select("id, question_code, status, stem, correct_option, exam_id")
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) {
    throw error;
  }

  if (data.length === 0) {
    return <p className="text-zinc-600">No questions yet. Import a CSV first.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 pr-4">Code</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Stem</th>
            <th className="py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((q) => (
            <tr key={q.id} className="border-b align-top">
              <td className="py-2 pr-4 font-mono">{q.question_code}</td>
              <td className="py-2 pr-4">{q.status}</td>
              <td className="py-2 pr-4">{q.stem.length > 120 ? `${q.stem.slice(0, 120)}...` : q.stem}</td>
              <td className="py-2">
                <StatusForm questionId={q.id} status={q.status as QuestionStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
