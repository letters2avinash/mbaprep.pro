export type CsvRecord = {
  // 1-based line in the file where the record starts. The header is line 1.
  line: number;
  fields: string[];
};

export class CsvParseError extends Error {}

// RFC 4180 parser. Handles quoted fields with commas, line breaks and doubled
// quotes, plus CRLF, LF and CR line endings. Skips a leading BOM and fully
// blank lines. Throws CsvParseError on an unterminated quoted field.
export function parseCsv(input: string): CsvRecord[] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const records: CsvRecord[] = [];

  let fields: string[] = [];
  let field = "";
  let inQuotes = false;
  let quoted = false;
  let line = 1;
  let recordLine = 1;
  let i = 0;

  const endField = () => {
    fields.push(field);
    field = "";
    quoted = false;
  };

  const endRecord = () => {
    endField();
    const isBlank = fields.length === 1 && fields[0] === "" && !quoted;
    if (!isBlank) {
      records.push({ line: recordLine, fields });
    }
    fields = [];
  };

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      if (ch === "\n") line++;
      field += ch;
      i++;
      continue;
    }

    if (ch === '"' && field === "") {
      inQuotes = true;
      quoted = true;
      i++;
      continue;
    }
    if (ch === ",") {
      endField();
      i++;
      continue;
    }
    if (ch === "\r" || ch === "\n") {
      endRecord();
      if (ch === "\r" && text[i + 1] === "\n") i++;
      line++;
      recordLine = line;
      i++;
      continue;
    }

    field += ch;
    i++;
  }

  if (inQuotes) {
    throw new CsvParseError(`Unterminated quoted field starting on line ${recordLine}.`);
  }

  if (field !== "" || fields.length > 0 || quoted) {
    endRecord();
  }

  return records;
}
