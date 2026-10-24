import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv/parse-csv";
import { validateQuestionRows, type ValidationRefs } from "./validate-question-rows";

const pattern = { allowed_option_counts: [4, 5], allowed_marks: null, allowed_negative_marks: null };

describe("questions_template.csv", () => {
  it("passes the validator against matching reference data", () => {
    const text = readFileSync(path.resolve(__dirname, "../../../templates/questions_template.csv"), "utf8");
    const refs: ValidationRefs = {
      exams: new Map([
        ["MOCK-CAT", { id: "c", is_active: true, pattern }],
        ["MOCK-GMAT", { id: "g", is_active: true, pattern }],
        ["MOCK-XAT", { id: "x", is_active: true, pattern }],
      ]),
      sections: new Map([
        ["MOCK-CAT/QA", { id: "cq", option_count: 4 }],
        ["MOCK-GMAT/QA", { id: "gq", option_count: 5 }],
        ["MOCK-XAT/DM", { id: "xd", option_count: 5 }],
      ]),
      existingQuestionCodes: new Set(),
    };

    const result = validateQuestionRows(parseCsv(text), refs);

    expect(result.fileError).toBeNull();
    expect(result.rejected).toEqual([]);
    expect(result.accepted.map((r) => r.exam_id)).toEqual(["c", "g", "x"]);
  });
});
