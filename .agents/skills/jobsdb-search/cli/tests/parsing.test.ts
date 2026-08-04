import { describe, expect, test } from "bun:test";
import {
  decodeHtmlEntities,
  extractAutomationBlock,
  jobageToDateRange,
  normalizeId,
  parseJobDetailHtml,
  toSearchResult,
  workTypeFlag,
} from "../src/helpers";

describe("normalizeId", () => {
  test("parses bare numeric ID", () => {
    expect(normalizeId("93650946")).toBe("93650946");
  });

  test("parses JobsDB URL", () => {
    expect(normalizeId("https://th.jobsdb.com/th/job/93650946")).toBe("93650946");
  });

  test("rejects invalid input", () => {
    expect(normalizeId("not-an-id")).toBeNull();
  });
});

describe("jobageToDateRange", () => {
  test("maps days to nearest bucket", () => {
    expect(jobageToDateRange(5)).toBe("7");
    expect(jobageToDateRange(14)).toBe("14");
    expect(jobageToDateRange(9999)).toBeNull();
  });
});

describe("workTypeFlag", () => {
  test("maps workplace modes", () => {
    expect(workTypeFlag("remote")).toBe("3");
    expect(workTypeFlag("hybrid")).toBe("2");
    expect(workTypeFlag("onsite")).toBe("1");
    expect(workTypeFlag(undefined)).toBeNull();
  });
});

describe("toSearchResult", () => {
  test("maps API item to standard shape", () => {
    const result = toSearchResult({
      id: "123",
      title: "Software Engineer",
      companyName: "Acme Co",
      listingDate: "2026-07-30T03:45:31Z",
      locations: [{ label: "Bangkok" }],
      teaser: "Great role",
      bulletPoints: ["React", "Node.js"],
      workArrangements: { displayText: "Hybrid" },
      workTypes: ["Full time"],
    });
    expect(result.id).toBe("123");
    expect(result.company).toBe("Acme Co");
    expect(result.location).toBe("Bangkok");
    expect(result.workArrangement).toBe("Hybrid");
    expect(result.description).toContain("Great role");
    expect(result.description).toContain("• React");
    expect(result.url).toBe("https://th.jobsdb.com/th/job/123");
  });
});

describe("parseJobDetailHtml", () => {
  test("extracts description from jobAdDetails block", () => {
    const html = `
      <meta property="og:title" content="Software Engineer Job in Bangkok - Jobsdb" />
      <div data-automation="jobAdDetails">
        <p><strong>Key Responsibilities:</strong></p>
        <ul><li><p>Write code</p></li></ul>
      </div>
    `;
    const job = parseJobDetailHtml(html, "123");
    expect(job.title).toBe("Software Engineer");
    expect(job.description).toContain("Key Responsibilities");
    expect(job.description).toContain("Write code");
  });
});

describe("extractAutomationBlock", () => {
  test("handles nested divs", () => {
    const html = '<div data-automation="jobAdDetails"><div><p>Hello</p></div></div>';
    const block = extractAutomationBlock(html, "jobAdDetails");
    expect(block).toContain("<p>Hello</p>");
  });
});

describe("decodeHtmlEntities", () => {
  test("decodes common entities", () => {
    expect(decodeHtmlEntities("A &amp; B &lt; C")).toBe("A & B < C");
  });
});
