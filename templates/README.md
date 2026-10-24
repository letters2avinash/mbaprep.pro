# Question bank CSV template

File: `questions_template.csv`. One row per question. Header row required, exact names, in this order.

Sample rows are labelled `SAMPLE` in the `explanation` column and use placeholder marks. They are not real exam content. Do not upload them to production.

## Before you upload

- The exam and section must already exist in the app. Only the exam catalogue is seeded (`MOCK-CAT`, `MOCK-GMAT`, `MOCK-XAT`). Create sections in the admin area first.
- The importer validates every row. A bad row is rejected with its row number and reason. Good rows are still written in one transaction per file.
- A duplicate `question_code` (already in the database, or repeated in the file) rejects that row.
- Report line numbers are file line numbers. The header is line 1, so the first question is line 2.
- Marks and negative marks allowed values come from `config/exam-patterns.json`. Those values are marked unverified until the owner confirms them.

## Columns

| Column | Required | Allowed values and rules |
|---|---|---|
| `question_code` | Yes | Unique across the whole bank. 1 to 64 characters: letters, digits, `-` or `_`. Example: `CAT-QA-0001`. |
| `exam_code` | Yes | An existing exam code: `MOCK-CAT`, `MOCK-GMAT` or `MOCK-XAT`. |
| `section_code` | Yes | An existing section code for that exam. |
| `topic` | No | Topic name within the section. Created if it does not exist yet. Leave blank for no topic. |
| `difficulty` | Yes | `easy`, `medium` or `hard`. |
| `option_count` | Yes | `4` or `5`. Must equal the section's option count. |
| `stem` | Yes | The question text. Must not be blank. Quote the field if it contains a comma. |
| `option_a` | Yes | Text of option A. |
| `option_b` | Yes | Text of option B. |
| `option_c` | Yes | Text of option C. |
| `option_d` | Yes | Text of option D. |
| `option_e` | Only if `option_count` is 5 | Text of option E. Must be empty when `option_count` is 4. |
| `correct_option` | Yes | `A`, `B`, `C`, `D` or `E`. Must be within `option_count`, so `E` needs 5 options. |
| `explanation` | Recommended | Shown to students after they answer. Plain text. Start sample rows with `SAMPLE:`. |
| `marks` | Yes | Number, zero or more, up to 2 decimal places. Must be an allowed value for the exam (see config). |
| `negative_marks` | Yes | Number, zero or more, up to 2 decimal places. Entered as a positive penalty (for example `1` means minus 1 for a wrong answer). Must be an allowed value for the exam (see config). |
| `tags` | No | Semicolon-separated labels, for example `percentages;easy-wins`. Spaces around each tag are trimmed. |
| `status` | No | `draft`, `reviewed` or `published`. Defaults to `draft`. Only `published` questions reach students. `reviewed` and `published` record the uploading admin as reviewer. |

## Status rules

- Every question has one status: `draft`, `reviewed` or `published`.
- AI-drafted questions must start as `draft`.
- Students only ever see `published` questions.

## Quoting

Use standard CSV quoting. Wrap a field in double quotes if it contains a comma, a line break or a double quote. Escape a double quote inside a field by doubling it (`""`). Save the file as UTF-8.
