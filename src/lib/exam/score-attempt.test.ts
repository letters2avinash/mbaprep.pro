import { describe, expect, it } from "vitest";
import { scoreAttempt, type ScoredQuestion } from "./score-attempt";

const questions: ScoredQuestion[] = [
  { id: "q1", option_count: 4, correct_option: "A", marks: 3, negative_marks: 1 },
  { id: "q2", option_count: 5, correct_option: "E", marks: 3, negative_marks: 1 },
  { id: "q3", option_count: 4, correct_option: "B", marks: 2, negative_marks: 0.5 },
];

describe("scoreAttempt", () => {
  it("adds marks for correct answers and subtracts negative marks for wrong ones", () => {
    const result = scoreAttempt(questions, [
      { question_id: "q1", selected_option: "A" },
      { question_id: "q2", selected_option: "C" },
      { question_id: "q3", selected_option: "B" },
    ]);
    expect(result.correct).toBe(2);
    expect(result.incorrect).toBe(1);
    expect(result.unanswered).toBe(0);
    expect(result.total).toBe(3 - 1 + 2);
  });

  it("gives no penalty for skipped questions", () => {
    const result = scoreAttempt(questions, [{ question_id: "q1", selected_option: null }]);
    expect(result.unanswered).toBe(3);
    expect(result.total).toBe(0);
  });

  it("supports a 5th option only on questions that have one", () => {
    const result = scoreAttempt(questions, [{ question_id: "q2", selected_option: "E" }]);
    expect(result.total).toBe(3);
    expect(() => scoreAttempt(questions, [{ question_id: "q1", selected_option: "E" }])).toThrow(/not valid/);
  });

  it("rejects answers for questions outside the test", () => {
    expect(() => scoreAttempt(questions, [{ question_id: "nope", selected_option: "A" }])).toThrow(/not in this test/);
  });

  it("rejects a question answered twice", () => {
    expect(() =>
      scoreAttempt(questions, [
        { question_id: "q1", selected_option: "A" },
        { question_id: "q1", selected_option: "B" },
      ]),
    ).toThrow(/more than once/);
  });

  it("keeps decimal marks exact", () => {
    const result = scoreAttempt(questions, [{ question_id: "q3", selected_option: "A" }]);
    expect(result.total).toBe(-0.5);
  });
});
