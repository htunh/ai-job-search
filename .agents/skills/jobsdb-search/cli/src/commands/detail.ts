import {
  buildSearchUrl,
  htmlFetch,
  JOB_URL_BASE,
  jsonFetch,
  normalizeId,
  parseJobDetailHtml,
  toSearchResult,
  writeError,
  type JobsDbSearchResponse,
} from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  if (!id) {
    writeError(`Could not parse a job ID from "${opts.id}"`, "BAD_ID")
    return 1
  }

  try {
    // Metadata from search API (company, location, date).
    const metaUrl = buildSearchUrl({ jobage: 9999, page: 1, pageSize: 1, jobId: id })
    const meta = await jsonFetch<JobsDbSearchResponse>(metaUrl)
    const base = meta?.data?.[0] ? toSearchResult(meta.data[0]) : null

    // Full description from HTML detail page.
    const html = await htmlFetch(`${JOB_URL_BASE}/${id}`)
    if (!html) {
      writeError("Job not found", "NOT_FOUND")
      return 1
    }
    const parsed = parseJobDetailHtml(html, id)
    const job = {
      ...parsed,
      company: base?.company ?? parsed.company,
      location: base?.location ?? parsed.location,
      date: base?.date ?? parsed.date,
      workArrangement: base?.workArrangement ?? null,
      salary: base?.salary ?? null,
      employmentType: base?.employmentType ?? null,
      title: base?.title ?? parsed.title,
    }

    if (opts.format === "plain") {
      const lines = [
        job.title,
        `${job.company || "—"} · ${job.location || "—"} · ${job.date ? job.date.slice(0, 10) : "—"}`,
        job.workArrangement ? `Arrangement: ${job.workArrangement}` : "",
        job.employmentType ? `Type: ${job.employmentType}` : "",
        job.salary ? `Salary: ${job.salary}` : "",
        "",
        job.description || "(no description)",
        "",
        `URL: ${job.url}`,
      ].filter((l) => l !== "")
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
