import { describe, expect, it } from "bun:test";
import { checkRateLimit } from "../rate-limit";

describe("checkRateLimit", () => {
  it("allows requests under the limit", () => {
    const ip = `test-${Date.now()}-allow`;
    const result = checkRateLimit(ip);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59);
  });

  it("counts down remaining", () => {
    const ip = `test-${Date.now()}-count`;
    checkRateLimit(ip);
    const second = checkRateLimit(ip);
    expect(second.remaining).toBe(58);
  });

  it("blocks after exceeding limit", () => {
    const ip = `test-${Date.now()}-block`;
    for (let i = 0; i < 60; i++) {
      checkRateLimit(ip);
    }
    const result = checkRateLimit(ip);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("tracks different IPs independently", () => {
    const ip1 = `test-${Date.now()}-a`;
    const ip2 = `test-${Date.now()}-b`;
    checkRateLimit(ip1);
    checkRateLimit(ip1);
    const r = checkRateLimit(ip2);
    expect(r.remaining).toBe(59); // ip2 is fresh
  });
});
