import type { CsvRecord } from "@/lib/csv/parse-csv";

export const EXPECTED_HEADERS = [
  "question_code",
  "exam_code",
  "section_code",
  "topic",
  "difficulty",
  "option_count",
  "stem",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "option_e",
  "correct_option",
  "explanation",
  "marks",
  "negative_marks",
  "tags",
  "status",
] as const;

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const STATUSES = ["draft", "reviewed", "published"] as const;
const OPTION_LETTERS = ["A", "B", "C", "D", "E"] as const;
const QUESTION_CODE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;
const MAX_STEM_LENGTH = 5000;
const MAX_EXPLANATION_LENGTH = 5000;
const MAX_TOPIC_LENGTH = 120;
const MAX_TAG_LENGTH = 40;
const MAX_TAGS = 10;

export type ExamPattern = {
  allowed_option_counts: number[];
  allowed_marks: number[] | null;
  allowed_negative_marks: number[] | null;
};

export type ValidationRefs = {
  exams: Map<string, { id: string; is_active: boolean; pattern: ExamPattern }>;
  // Keyed by `${exam_code}/${section_code}`.
  sections: Map<string, { id: string; option_count: number }>;
  existingQuestionCodes: Set<string>;
};

export type ImportRow = {
  line: number;
  question_code: string;
  exam_id: string;
  section_id: string;
  topic: string | null;
  difficulty: (typeof DIFFICULTIES)[number];
  option_count: number;
  stem: string;
  options: string[];
  correct_option: (typeof OPTION_LETTERS)[number];
  explanation: string | null;
  marks: number;
  negative_marks: number;
  tags: string[];
  status: (typeof STATUSES)[number];
};

export type RowResult =
  | { ok: true; row: ImportRow }
  | { ok: false; line: number; question_code: string; errors: string[] };

export type FileValidation = {
  // Set when the file as a whole cannot be imported (for example bad headers).
  fileError: string | null;
  accepted: ImportRow[];
  rejected: Extract<RowResult, { ok: false }>[];
};

// Validates every row. Never stops at the first error, so the report lists
// all problems for each row. Accepted rows are returned in file order.
export function validateQuestionRows(
  records: CsvRecord[],
  refs: ValidationRefs,
): FileValidation {
  if (records.length === 0) {
    return { fileError: "The file is empty.", accepted: [], rejected: [] };
  }

  const header = records[0].fields.map((h) => h.trim().toLowerCase());
  const missing = EXPECTED_HEADERS.filter((h) => !header.includes(h));
  const unknown = header.filter((h) => !(EXPECTED_HEADERS as readonly string[]).includes(h));
  if (missing.length > 0 || unknown.length > 0) {
    const parts = [];
    if (missing.length > 0) parts.push(`missing columns: ${missing.join(", ")}`);
    if (unknown.length > 0) parts.push(`unknown columns: ${unknown.join(", ")}`);
    return { fileError: `Header row does not match the template (${parts.join("; ")}).`, accepted: [], rejected: [] };
  }

  const index = Object.fromEntries(header.map((h, i) => [h, i])) as Record<(typeof EXPECTED_HEADERS)[number], number>;
  const accepted: ImportRow[] = [];
  const rejected: FileValidation["rejected"] = [];
  const seenInFile = new Map<string, number>();

  for (const record of records.slice(1)) {
    const get = (name: (typeof EXPECTED_HEADERS)[number]) => (record.fields[index[name]] ?? "").trim();
    const questionCode = get("question_code");
    const errors: string[] = [];

    if (!QUESTION_CODE_PATTERN.test(questionCode)) {
      errors.push("question_code must be 1 to 64 letters, digits, '-' or '_'.");
    } else {
      if (refs.existingQuestionCodes.has(questionCode)) {
        errors.push("question_code already exists in the question bank.");
      }
      const firstLine = seenInFile.get(questionCode);
      if (firstLine !== undefined) {
        errors.push(`question_code repeated in this file (first used on line ${firstLine}).`);
      } else {
        seenInFile.set(questionCode, record.line);
      }
    }

    const examCode = get("exam_code");
    const exam = refs.exams.get(examCode);
    if (!exam) {
      errors.push(`exam_code '${examCode}' is not a known exam.`);
    } else if (!exam.is_active) {
      errors.push(`exam_code '${examCode}' is not active.`);
    }

    const sectionCode = get("section_code");
    const section = exam ? refs.sections.get(`${examCode}/${sectionCode}`) : undefined;
    if (exam && !section) {
      errors.push(`section_code '${sectionCode}' does not exist for ${examCode}. Create it in admin first.`);
    }

    const topic = get("topic");
    if (topic.length > MAX_TOPIC_LENGTH) {
      errors.push(`topic must be at most ${MAX_TOPIC_LENGTH} characters.`);
    }

    const difficulty = get("difficulty").toLowerCase();
    if (!(DIFFICULTIES as readonly string[]).includes(difficulty)) {
      errors.push("difficulty must be easy, medium or hard.");
    }

    const optionCountText = get("option_count");
    const optionCount = Number(optionCountText);
    if (optionCountText !== "4" && optionCountText !== "5") {
      errors.push("option_count must be 4 or 5.");
    } else {
      if (section && section.option_count !== optionCount) {
        errors.push(`option_count ${optionCount} does not match section ${sectionCode} (${section.option_count}).`);
      }
      if (exam && !exam.pattern.allowed_option_counts.includes(optionCount)) {
        errors.push(`option_count ${optionCount} is not allowed for ${examCode} (see config).`);
      }
    }

    const stem = get("stem");
    if (stem === "") {
      errors.push("stem must not be blank.");
    } else if (stem.length > MAX_STEM_LENGTH) {
      errors.push(`stem must be at most ${MAX_STEM_LENGTH} characters.`);
    }

    const options = [get("option_a"), get("option_b"), get("option_c"), get("option_d")];
    const optionE = get("option_e");
    if (optionCountText === "5") {
      if (optionE === "") errors.push("option_e is required when option_count is 5.");
      else options.push(optionE);
    } else if (optionCountText === "4" && optionE !== "") {
      errors.push("option_e must be empty when option_count is 4.");
    }
    options.forEach((text, i) => {
      if (text === "") errors.push(`option_${OPTION_LETTERS[i].toLowerCase()} must not be blank.`);
    });

    const correct = get("correct_option").toUpperCase();
    if (!(OPTION_LETTERS as readonly string[]).includes(correct)) {
      errors.push("correct_option must be A, B, C, D or E.");
    } else if (optionCountText === "4" || optionCountText === "5") {
      if (OPTION_LETTERS.indexOf(correct as (typeof OPTION_LETTERS)[number]) >= optionCount) {
        errors.push(`correct_option ${correct} is not valid for option_count ${optionCount}.`);
      }
    }

    const explanation = get("explanation");
    if (explanation.length > MAX_EXPLANATION_LENGTH) {
      errors.push(`explanation must be at most ${MAX_EXPLANATION_LENGTH} characters.`);
    }

    const marks = parseAllowedNumber(get("marks"), "marks", exam?.pattern.allowed_marks ?? null, examCode, errors);
    const negativeMarks = parseAllowedNumber(
      get("negative_marks"),
      "negative_marks",
      exam?.pattern.allowed_negative_marks ?? null,
      examCode,
      errors,
    );

    const tags = get("tags")
      .split(";")
      .map((t) => t.trim())
      .filter((t) => t !== "");
    if (tags.length > MAX_TAGS) {
      errors.push(`at most ${MAX_TAGS} tags are allowed.`);
    }
    if (tags.some((t) => t.length > MAX_TAG_LENGTH)) {
      errors.push(`each tag must be at most ${MAX_TAG_LENGTH} characters.`);
    }

    const statusText = get("status").toLowerCase();
    const status = statusText === "" ? "draft" : statusText;
    if (!(STATUSES as readonly string[]).includes(status)) {
      errors.push("status must be draft, reviewed or published (or blank for draft).");
    }

    if (errors.length > 0 || !exam || !section || marks === null || negativeMarks === null) {
      rejected.push({ ok: false, line: record.line, question_code: questionCode, errors });
      continue;
    }

    accepted.push({
      line: record.line,
      question_code: questionCode,
      exam_id: exam.id,
      section_id: section.id,
      topic: topic === "" ? null : topic,
      difficulty: difficulty as ImportRow["difficulty"],
      option_count: optionCount,
      stem,
      options,
      correct_option: correct as ImportRow["correct_option"],
      explanation: explanation === "" ? null : explanation,
      marks,
      negative_marks: negativeMarks,
      tags,
      status: status as ImportRow["status"],
    });
  }

  return { fileError: null, accepted, rejected };
}

// Parses a non-negative decimal and checks it against the config list.
// A null allowed list means the config does not restrict this value yet.
function parseAllowedNumber(
  text: string,
  column: string,
  allowed: number[] | null,
  examCode: string,
  errors: string[],
): number | null {
  if (!DECIMAL_PATTERN.test(text)) {
    errors.push(`${column} must be a number with at most 2 decimal places and no sign.`);
    return null;
  }
  const value = Number(text);
  if (allowed !== null && !allowed.includes(value)) {
    errors.push(`${column} ${text} is not an allowed value for ${examCode} (see config).`);
    return null;
  }
  return value;
}
