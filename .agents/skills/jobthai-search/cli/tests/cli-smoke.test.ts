import { describe, expect, test } from "bun:test";
import { runCLI } from "./helpers";

function parsedStderr(stderr: string): { error?: string; code?: string } {
  try {
    return JSON.parse(stderr);
  } catch {
    return {};
  }
}

describe("JobThai CLI flag validation", () => {
  test("non-numeric --jobage exits 1 with BAD_ARG", async () => {
    const result = await runCLI(["search", "--jobage", "foo"]);
    expect(result.exitCode).not.toBe(0);
    const err = parsedStderr(result.stderr);
    expect(err.code).toBe("BAD_ARG");
  });

  test("detail without id exits 1 with NO_ID", async () => {
    const result = await runCLI(["detail"]);
    expect(result.exitCode).not.toBe(0);
    const err = parsedStderr(result.stderr);
    expect(err.code).toBe("NO_ID");
  });

  test("unknown command exits 1 with BAD_CMD", async () => {
    const result = await runCLI(["bogus"]);
    expect(result.exitCode).not.toBe(0);
    const err = parsedStderr(result.stderr);
    expect(err.code).toBe("BAD_CMD");
  });
});

describe("JobThai CLI live smoke test", () => {
  test("search returns at least one result with id/title/url", async () => {
    const result = await runCLI([
      "search",
      "-q",
      "react",
      "-l",
      "Bangkok",
      "--limit",
      "3",
      "--format",
      "json",
    ]);
    expect(result.exitCode).toBe(0);
    const data = JSON.parse(result.stdout) as {
      results: Array<{ id: string; title: string; url: string }>;
    };
    expect(data.results.length).toBeGreaterThan(0);
    const first = data.results[0];
    expect(first.id).toBeTruthy();
    expect(first.title).toBeTruthy();
    expect(first.url).toMatch(/jobthai\.com\/(en|th)\/job\/\d+/);
  });

  test("detail returns readable description", async () => {
    const search = await runCLI([
      "search",
      "-q",
      "react",
      "-l",
      "Bangkok",
      "--limit",
      "1",
      "--format",
      "json",
    ]);
    expect(search.exitCode).toBe(0);
    const { results } = JSON.parse(search.stdout) as {
      results: Array<{ id: string }>;
    };
    const id = results[0]?.id;
    expect(id).toBeTruthy();

    const detail = await runCLI(["detail", id, "--format", "json"]);
    expect(detail.exitCode).toBe(0);
    const job = JSON.parse(detail.stdout) as { description?: string; title: string };
    expect(job.title).toBeTruthy();
    expect(job.description && job.description.length > 20).toBe(true);
  });
});
