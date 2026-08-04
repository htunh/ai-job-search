import { describe, expect, test } from "bun:test";
import { resolveProvince, normalizeId, withinJobAge, jobUrl } from "../src/helpers";

describe("JobThai helpers", () => {
  test("resolveProvince maps Bangkok to 01", () => {
    expect(resolveProvince("Bangkok")).toBe("01");
    expect(resolveProvince("01")).toBe("01");
  });

  test("normalizeId parses URL and bare id", () => {
    expect(normalizeId("1939404")).toBe("1939404");
    expect(normalizeId("https://www.jobthai.com/en/job/1939404")).toBe("1939404");
    expect(normalizeId("bad")).toBeNull();
  });

  test("withinJobAge filters old postings", () => {
    const recent = new Date().toISOString();
    const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    expect(withinJobAge(recent, 14)).toBe(true);
    expect(withinJobAge(old, 14)).toBe(false);
    expect(withinJobAge(old, 9999)).toBe(true);
  });

  test("jobUrl builds canonical link", () => {
    expect(jobUrl("123", "en")).toBe("https://www.jobthai.com/en/job/123");
  });
});
