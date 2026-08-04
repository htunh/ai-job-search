import {
  buildSearchUrl,
  jsonFetch,
  toSearchResult,
  writeError,
  type JobResult,
  type JobsDbSearchResponse,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  jobage: number
  remote?: string
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

function shortDate(date: string | null): string {
  return date ? date.slice(0, 10) : "—"
}

function renderTable(rows: JobResult[]): string {
  if (rows.length === 0) return "No results."
  const header =
    "ID".padEnd(10) +
    " " +
    "TITLE".padEnd(40) +
    " " +
    "COMPANY".padEnd(24) +
    " " +
    "LOCATION".padEnd(22) +
    " " +
    "DATE".padEnd(10) +
    " ARR"
  const body = rows.map((r) => {
    const title = (r.title || "").slice(0, 40).padEnd(40)
    const company = (r.company || "—").slice(0, 24).padEnd(24)
    const loc = (r.location || "—").slice(0, 22).padEnd(22)
    const date = shortDate(r.date).padEnd(10)
    const arr = (r.workArrangement || "—").slice(0, 8)
    return `${r.id.padEnd(10)} ${title} ${company} ${loc} ${date} ${arr}`
  })
  return [header, "-".repeat(header.length), ...body].join("\n")
}

function renderPlain(rows: JobResult[]): string {
  if (rows.length === 0) return "No results."
  return rows
    .map(
      (r) =>
        `${r.title}\n  ${r.company || "—"} · ${r.location || "—"} · ${shortDate(r.date)} · ${r.workArrangement || "—"}\n  id: ${r.id}\n  ${r.url}`,
    )
    .join("\n\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const pageSize = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 50) : 20
    const url = buildSearchUrl({
      query: opts.query,
      location: opts.location,
      jobage: opts.jobage,
      remote: opts.remote,
      page: opts.page,
      pageSize,
    })
    const data = await jsonFetch<JobsDbSearchResponse>(url)
    if (!data) {
      writeError("Search returned no data", "SEARCH_FAILED")
      return 1
    }
    let rows = (data.data ?? []).map(toSearchResult)
    if (opts.limit !== undefined && opts.limit >= 0) rows = rows.slice(0, opts.limit)
    const total = data.totalCount ?? rows.length

    if (opts.format === "table") {
      process.stdout.write(renderTable(rows) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(renderPlain(rows) + "\n")
    } else {
      process.stdout.write(
        JSON.stringify({ meta: { count: rows.length, page: opts.page, total }, results: rows }, null, 2) +
          "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
