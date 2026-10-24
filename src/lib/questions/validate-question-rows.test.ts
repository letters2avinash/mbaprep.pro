import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv/parse-csv";
import { EXPECTED_HEADERS, type ValidationRefs, validateQuestionRows } from "./validate-question-rows";

const HEADER = EXPECTED_HEADERS.join(",");
const CAT_ID = "11111111-1111-4111-8111-111111111111";
const XAT_ID = "22222222-2222-4222-8222-222222222222";
const QA_ID = "33333333-3333-4333-8333-333333333333";

function refs(overrides: Partial<ValidationRefs> = {}): ValidationRefs {
  return {
    exams: new Map([
      ["MOCK-CAT", { id: CAT_ID, is_active: true, pattern: { allowed_option_counts: [4, 5], allowed_marks: null, allowed_negative_marks: null } }],
      ["MOCK-XAT", { id: XAT_ID, is_active: false, pattern: { allowed_option_counts: [4, 5], allowed_marks: null, allowed_negative_marks: null } }],
    ]),
    sections: new Map([["MOCK-CAT/QA", { id: QA_ID, option_count: 4 }]]),
    existingQuestionCodes: new Set(["OLD-001"]),
    ...overrides,
  };
}

// Builds one CSV line. Unset fields get a valid default.
function line(overrides: Partial<Record<(typeof EXPECTED_HEADERS)[number], string>> = {}) {
  const base: Record<string, string> = {
    question_code: "CAT-QA-0001",
    exam_code: "MOCK-CAT",
    section_code: "QA",
    topic: "Percentages",
    difficulty: "easy",
    option_count: "4",
    stem: "What is 15% of 200?",
    option_a: "30",
    option_b: "25",
    option_c: "20",
    option_d: "15",
    option_e: "",
    correct_option: "A",
    explanation: "15% of 200 is 30.",
    marks: "1",
    negative_marks: "0",
    tags: "percentages; easy-wins",
    status: "draft",
    ...overrides,
  };
  return EXPECTED_HEADERS.map((h) => base[h]).join(",");
}

function validate(rows: string[], r = refs()) {
  return validateQuestionRows(parseCsv([HEADER, ...rows].join("\n")), r);
}

describe("validateQuestionRows", () => {
  it("accepts a valid row and normalises its fields", () => {
    const result = validate([line()]);
    expect(result.fileError).toBeNull();
    expect(result.rejected).toEqual([]);
    expect(result.accepted).toEqual([
      expect.objectContaining({
        line: 2,
        question_code: "CAT-QA-0001",
        exam_id: CAT_ID,
        section_id: QA_ID,
        topic: "Percentages",
        options: ["30", "25", "20", "15"],
        correct_option: "A",
        marks: 1,
        negative_marks: 0,
        tags: ["percentages", "easy-wins"],
        status: "draft",
      }),
    ]);
  });

  it("rejects a file whose header does not match the template", () => {
    const result = validateQuestionRows(parseCsv("question_code,stem\nX,y"), refs());
    expect(result.fileError).toMatch(/missing columns/);
    expect(result.accepted).toEqual([]);
  });

  it("reports every problem in a row, not just the first", () => {
    const result = validate([line({ difficulty: "impossible", stem: " ", correct_option: "Z" })]);
    expect(result.accepted).toEqual([]);
    expect(result.rejected[0].errors).toEqual(
      expect.arrayContaining([
        "difficulty must be easy, medium or hard.",
        "stem must not be blank.",
        "correct_option must be A, B, C, D or E.",
      ]),
    );
  });

  it("rejects a question code already in the bank", () => {
    const result = validate([line({ question_code: "OLD-001" })]);
    expect(result.rejected[0].errors).toContain("question_code already exists in the question bank.");
  });

  it("rejects a repeated question code within the file, naming the first line", () => {
    const result = validate([line(), line({ stem: "Another" })]);
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected[0].line).toBe(3);
    expect(result.rejected[0].errors).toEqual(["question_code repeated in this file (first used on line 2)."]);
  });

  it("rejects unknown exams, inactive exams and unknown sections", () => {
    const result = validate([
      line({ question_code: "A", exam_code: "MOCK-NOPE" }),
      line({ question_code: "B", exam_code: "MOCK-XAT", section_code: "VA" }),
      line({ question_code: "C", section_code: "DI" }),
    ]);
    expect(result.rejected.map((r) => r.errors)).toEqual([
      ["exam_code 'MOCK-NOPE' is not a known exam."],
      ["exam_code 'MOCK-XAT' is not active.", "section_code 'VA' does not exist for MOCK-XAT. Create it in admin first."],
      ["section_code 'DI' does not exist for MOCK-CAT. Create it in admin first."],
    ]);
  });

  it("requires option_e for 5 options and forbids it for 4", () => {
    const five = validate([line({ option_count: "5", option_e: "" })], refs({
      sections: new Map([["MOCK-CAT/QA", { id: QA_ID, option_count: 5 }]]),
    }));
    expect(five.rejected[0].errors).toContain("option_e is required when option_count is 5.");

    const four = validate([line({ option_e: "99" })]);
    expect(four.rejected[0].errors).toContain("option_e must be empty when option_count is 4.");
  });

  it("rejects an option_count that differs from the section", () => {
    const result = validate([line({ option_count: "5", option_e: "x" })]);
    expect(result.rejected[0].errors).toContain("option_count 5 does not match section QA (4).");
  });

  it("rejects a correct_option beyond the option count", () => {
    const result = validate([line({ correct_option: "E" })]);
    expect(result.rejected[0].errors).toContain("correct_option E is not valid for option_count 4.");
  });

  it("rejects marks with signs or more than 2 decimals", () => {
    const result = validate([line({ marks: "-1", negative_marks: "1.234" })]);
    expect(result.rejected[0].errors).toEqual([
      "marks must be a number with at most 2 decimal places and no sign.",
      "negative_marks must be a number with at most 2 decimal places and no sign.",
    ]);
  });

  it("enforces allowed marks from config when a list is set", () => {
    const result = validate([line({ marks: "2" })], refs({
      exams: new Map([["MOCK-CAT", { id: CAT_ID, is_active: true, pattern: { allowed_option_counts: [4], allowed_marks: [1], allowed_negative_marks: [0] } }]]),
    }));
    expect(result.rejected[0].errors).toEqual(["marks 2 is not an allowed value for MOCK-CAT (see config)."]);
  });

  it("defaults a blank status to draft and rejects unknown statuses", () => {
    expect(validate([line({ status: "" })]).accepted[0].status).toBe("draft");
    expect(validate([line({ status: "live" })]).rejected[0].errors).toEqual([
      "status must be draft, reviewed or published (or blank for draft).",
    ]);
  });

  it("keeps accepted and rejected rows separate, with line numbers", () => {
    const result = validate([line({ question_code: "GOOD-1" }), line({ question_code: "BAD-1", stem: "" })]);
    expect(result.accepted.map((r) => r.line)).toEqual([2]);
    expect(result.rejected.map((r) => [r.line, r.question_code])).toEqual([[3, "BAD-1"]]);
  });
});
