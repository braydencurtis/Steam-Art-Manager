import { describe, expect, it } from "vitest";
import { beginRequest, isLatestRequest } from "./RequestGuard";

describe("RequestGuard", () => {
  it("treats a single request as the latest for its key", () => {
    const token = beginRequest("single-request-key");

    expect(isLatestRequest("single-request-key", token)).toBe(true);
  });

  it("invalidates an earlier token once a newer request begins for the same key - the later click wins regardless of resolution order", () => {
    const firstToken = beginRequest("same-key");
    const secondToken = beginRequest("same-key");

    expect(isLatestRequest("same-key", firstToken)).toBe(false);
    expect(isLatestRequest("same-key", secondToken)).toBe(true);
  });

  it("does not let requests for different keys interfere with each other", () => {
    const tokenA = beginRequest("game-a:Hero");
    const tokenB = beginRequest("game-b:Hero");

    expect(isLatestRequest("game-a:Hero", tokenA)).toBe(true);
    expect(isLatestRequest("game-b:Hero", tokenB)).toBe(true);
  });

  it("does not let the same game's different grid types interfere with each other", () => {
    const heroToken = beginRequest("game-a:Hero");
    const logoToken = beginRequest("game-a:Logo");

    expect(isLatestRequest("game-a:Hero", heroToken)).toBe(true);
    expect(isLatestRequest("game-a:Logo", logoToken)).toBe(true);
  });

  it("returns false for a key that has never had a request begun", () => {
    expect(isLatestRequest("never-requested", 1)).toBe(false);
  });
});
