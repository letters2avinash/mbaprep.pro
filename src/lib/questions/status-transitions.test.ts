import { describe, expect, it } from "vitest";
import { canTransition, isQuestionStatus } from "./status-transitions";

describe("canTransition", () => {
  it("allows draft to reviewed and back", () => {
    expect(canTransition("draft", "reviewed")).toBe(true);
    expect(canTransition("reviewed", "draft")).toBe(true);
  });

  it("requires review before publishing", () => {
    expect(canTransition("draft", "published")).toBe(false);
    expect(canTransition("reviewed", "published")).toBe(true);
  });

  it("allows unpublishing back to reviewed", () => {
    expect(canTransition("published", "reviewed")).toBe(true);
    expect(canTransition("published", "draft")).toBe(false);
  });

  it("does not allow a status to move to itself", () => {
    expect(canTransition("draft", "draft")).toBe(false);
    expect(canTransition("published", "published")).toBe(false);
  });
});

describe("isQuestionStatus", () => {
  it("accepts only the three statuses", () => {
    expect(isQuestionStatus("published")).toBe(true);
    expect(isQuestionStatus("live")).toBe(false);
  });
});
