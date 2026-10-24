import { Suspense } from "react";
import { AccessDeniedError, requireAdmin } from "@/lib/auth/require-admin";
import { ImportForm } from "./import-form";

export default function QuestionImportPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Import questions (CSV)</h1>
        <p className="text-zinc-600">
          Upload a file that follows templates/questions_template.csv. Every row is checked before anything is written.
          Rejected rows are listed with their line numbers and reasons. Accepted rows are written in one transaction.
        </p>
      </header>
      <Suspense fallback={<p className="text-zinc-600">Checking access...</p>}>
        <AdminGate />
      </Suspense>
    </main>
  );
}

// Access is checked on the server for every request. The form is only
// rendered for an allowed admin. The server action checks again on upload.
async function AdminGate() {
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

  return <ImportForm />;
}
