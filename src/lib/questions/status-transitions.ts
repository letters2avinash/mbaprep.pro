export const QUESTION_STATUSES = ["draft", "reviewed", "published"] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

// Allowed moves. A question must be reviewed before it can be published, so
// nothing reaches students without a reviewer on record.
const ALLOWED: Record<QuestionStatus, readonly QuestionStatus[]> = {
  draft: ["reviewed"],
  reviewed: ["draft", "published"],
  published: ["reviewed"],
};

export function canTransition(from: QuestionStatus, to: QuestionStatus): boolean {
  return ALLOWED[from].includes(to);
}

export function isQuestionStatus(value: string): value is QuestionStatus {
  return (QUESTION_STATUSES as readonly string[]).includes(value);
}
