export type ScoredQuestion = {
  id: string;
  option_count: number;
  correct_option: string;
  marks: number;
  negative_marks: number;
};

// A selected option is a letter (A to E) or null when the student skipped it.
export type AnswerInput = { question_id: string; selected_option: string | null };

export type ScoredAnswer = {
  question_id: string;
  selected_option: string | null;
  is_correct: boolean | null;
  marks_awarded: number;
};

export type AttemptScore = {
  answers: ScoredAnswer[];
  correct: number;
  incorrect: number;
  unanswered: number;
  total: number;
};

// Scores one attempt against the questions in the test. Marks and negative
// marks come from each question row, which is set from config at import time.
// Skipped questions get no penalty. An answer outside the question's option
// count is rejected, because it can't be a valid choice.
export function scoreAttempt(questions: ScoredQuestion[], answers: AnswerInput[]): AttemptScore {
  const byQuestion = new Map(questions.map((q) => [q.id, q]));
  const answered = new Map<string, string | null>();

  for (const answer of answers) {
    const question = byQuestion.get(answer.question_id);
    if (!question) {
      throw new Error(`Answer refers to a question that is not in this test: ${answer.question_id}`);
    }
    if (answered.has(answer.question_id)) {
      throw new Error(`Question answered more than once: ${answer.question_id}`);
    }
    if (answer.selected_option !== null) {
      const index = "ABCDE".indexOf(answer.selected_option);
      if (index < 0 || index >= question.option_count) {
        throw new Error(`Option ${answer.selected_option} is not valid for question ${answer.question_id}`);
      }
    }
    answered.set(answer.question_id, answer.selected_option);
  }

  const scored: ScoredAnswer[] = questions.map((question) => {
    const selected = answered.get(question.id) ?? null;
    if (selected === null) {
      return { question_id: question.id, selected_option: null, is_correct: null, marks_awarded: 0 };
    }
    const isCorrect = selected === question.correct_option;
    return {
      question_id: question.id,
      selected_option: selected,
      is_correct: isCorrect,
      marks_awarded: isCorrect ? question.marks : -question.negative_marks,
    };
  });

  const correct = scored.filter((a) => a.is_correct === true).length;
  const incorrect = scored.filter((a) => a.is_correct === false).length;
  const unanswered = scored.filter((a) => a.is_correct === null).length;
  const total = Math.round(scored.reduce((sum, a) => sum + a.marks_awarded, 0) * 100) / 100;

  return { answers: scored, correct, incorrect, unanswered, total };
}
