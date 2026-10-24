import { describe, expect, it } from "vitest";
import { CsvParseError, parseCsv } from "./parse-csv";

describe("parseCsv", () => {
  it("parses plain rows and reports the starting line of each record", () => {
    const records = parseCsv("a,b\n1,2\n3,4\n");
    expect(records).toEqual([
      { line: 1, fields: ["a", "b"] },
      { line: 2, fields: ["1", "2"] },
      { line: 3, fields: ["3", "4"] },
    ]);
  });

  it("keeps commas, doubled quotes and line breaks inside quoted fields", () => {
    const records = parseCsv('stem,expl\n"If a, b; ""c"" is 1",\n"line one\nline two",x\n');
    expect(records[1].fields).toEqual(['If a, b; "c" is 1', ""]);
    expect(records[2]).toEqual({ line: 3, fields: ["line one\nline two", "x"] });
  });

  it("handles CRLF, a leading BOM and skips blank lines", () => {
    const records = parseCsv("﻿a,b\r\n\r\n1,2\r\n");
    expect(records).toEqual([
      { line: 1, fields: ["a", "b"] },
      { line: 3, fields: ["1", "2"] },
    ]);
  });

  it("keeps trailing empty fields", () => {
    expect(parseCsv("a,b,c\n1,,\n")[1].fields).toEqual(["1", "", ""]);
  });

  it("throws on an unterminated quoted field", () => {
    expect(() => parseCsv('a,b\n"open,1\n')).toThrow(CsvParseError);
  });
});
