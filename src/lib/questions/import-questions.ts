import * as Sentry from "@sentry/nextjs";
import examPatternsConfig from "../../../config/exam-patterns.json";
import { CsvParseError, parseCsv } from "@/lib/csv/parse-csv";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { type ExamPattern, type ImportRow, type ValidationRefs, validateQuestionRows } from "./validate-question-rows";

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2000;
const PAGE_SIZE = 1000;

export type ImportReport = {
  fileName: string;
  // Set when the whole file is refused. Nothing is written in that case.
  fileError: string | null;
  acceptedCount: number;
  writtenCount: number;
  rejected: { line: number; question_code: string; errors: string[] }[];
  // Set when the single write transaction failed. Nothing is written then.
  writeError: string | null;
};

export type ImportState = { message: string; report?: undefined } | { message?: undefined; report: ImportReport } | null;

// Validates one uploaded CSV and writes its accepted rows in one transaction.
// Caller must already have checked that the user is an allowed admin.
export async function importQuestionsFile(file: FormDataEntryValue | null, actorId: string): Promise<ImportState> {
  if (!(file instanceof File) || file.size === 0) {
    return { message: "Choose a CSV file to upload." };
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { message: "The file must be a .csv file." };
  }
  if (file.size > MAX_IMPORT_BYTES) {
    return { message: "The file is larger than 2 MB. Split it into smaller files." };
  }

  const fileName = file.name;
  const report = (partial: Partial<ImportReport>): ImportState => ({
    report: {
      fileName,
      fileError: null,
      acceptedCount: 0,
      writtenCount: 0,
      rejected: [],
      writeError: null,
      ...partial,
    },
  });

  let records;
  try {
    records = parseCsv(await file.text());
  } catch (error) {
    if (error instanceof CsvParseError) {
      return report({ fileError: error.message });
    }
    throw error;
  }

  if (records.length - 1 > MAX_IMPORT_ROWS) {
    return report({ fileError: `The file has more than ${MAX_IMPORT_ROWS} rows. Split it into smaller files.` });
  }

  const admin = createSupabaseAdminClient();
  const refs = await loadValidationRefs(admin);
  const validation = validateQuestionRows(records, refs);

  if (validation.fileError) {
    return report({ fileError: validation.fileError });
  }

  let writtenCount = 0;
  let writeError: string | null = null;
  if (validation.accepted.length > 0) {
    const { data, error } = await admin.rpc("import_questions_batch", {
      p_rows: validation.accepted.map(toDatabaseRow),
      p_actor: actorId,
    });
    if (error) {
      // The function runs as one transaction, so this means nothing was written.
      Sentry.captureException(error, { tags: { area: "question-import" } });
      writeError = "The database rejected the write, so nothing was imported from this file. Fix the rows and try again.";
    } else {
      writtenCount = data as number;
    }
  }

  return report({
    acceptedCount: validation.accepted.length,
    writtenCount,
    rejected: validation.rejected.map(({ line, question_code, errors }) => ({ line, question_code, errors })),
    writeError,
  });
}

// Loads exam, section and existing-code reference data. Pages through the
// question codes so the PostgREST row limit does not hide duplicates.
async function loadValidationRefs(admin: ReturnType<typeof createSupabaseAdminClient>): Promise<ValidationRefs> {
  const { data: exams, error: examsError } = await admin.from("exams").select("id, code, is_active");
  if (examsError) throw examsError;

  const { data: sections, error: sectionsError } = await admin
    .from("sections")
    .select("id, code, option_count, exam_id");
  if (sectionsError) throw sectionsError;

  const existingQuestionCodes = new Set<string>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin
      .from("questions")
      .select("question_code")
      .order("question_code")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    data.forEach((row) => existingQuestionCodes.add(row.question_code));
    if (data.length < PAGE_SIZE) break;
  }

  const examsById = new Map(exams.map((e) => [e.id, e.code]));
  const configuredExams = examPatternsConfig.exams as Record<string, ExamPattern>;

  return {
    exams: new Map(
      exams.map((e) => [
        e.code,
        {
          id: e.id,
          is_active: e.is_active,
          // An exam missing from config allows no option counts, so its rows are rejected.
          pattern: configuredExams[e.code] ?? { allowed_option_counts: [], allowed_marks: null, allowed_negative_marks: null },
        },
      ]),
    ),
    sections: new Map(
      sections.map((s) => [`${examsById.get(s.exam_id)}/${s.code}`, { id: s.id, option_count: s.option_count }]),
    ),
    existingQuestionCodes,
  };
}

function toDatabaseRow(row: ImportRow) {
  return {
    question_code: row.question_code,
    exam_id: row.exam_id,
    section_id: row.section_id,
    topic: row.topic,
    difficulty: row.difficulty,
    option_count: row.option_count,
    stem: row.stem,
    options: row.options,
    correct_option: row.correct_option,
    explanation: row.explanation,
    marks: row.marks,
    negative_marks: row.negative_marks,
    tags: row.tags,
    status: row.status,
  };
}
