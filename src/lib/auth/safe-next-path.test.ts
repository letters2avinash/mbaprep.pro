import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next-path";

describe("safeNextPath", () => {
  it("keeps local paths", () => {
    expect(safeNextPath("/admin/questions/import")).toBe("/admin/questions/import");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
  });

  it("falls back to the home page for empty input", () => {
    expect(safeNextPath("")).toBe("/");
  });
});
