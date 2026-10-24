"use server";

import * as Sentry from "@sentry/nextjs";
import { AccessDeniedError, requireAdmin } from "@/lib/auth/require-admin";
import { type ImportState, importQuestionsFile } from "@/lib/questions/import-questions";

// Server action. The role check runs here, on the server, for every upload.
// Hiding the form in the UI is not a control.
export async function importQuestionsCsv(_previous: ImportState, formData: FormData): Promise<ImportState> {
  try {
    const { userId } = await requireAdmin(["content", "academic"]);
    return await importQuestionsFile(formData.get("file"), userId);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { message: error.message };
    }
    Sentry.captureException(error, { tags: { area: "question-import" } });
    return { message: "The import could not be completed. Nothing was written. Please try again." };
  }
}
