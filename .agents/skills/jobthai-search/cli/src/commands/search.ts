import {
  fetchSearchPage,
  resolveProvince,
  toSearchResult,
  withinJobAge,
  writeError,
  type JobResult,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  jobage: number
  remote?: string
  jobtype?: string
  lang: "en" | "th"
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
    "TITLE".padEnd(42) +
    " " +
    "COMPANY".padEnd(24) +
    " " +
    "LOCATION".padEnd(20) +
    " " +
    "DATE".padEnd(10)
  const body = rows.map((r) => {
    const title = (r.title || "").slice(0, 42).padEnd(42)
    const company = (r.company || "—").slice(0, 24).padEnd(24)
    const loc = (r.location || "—").slice(0, 20).padEnd(20)
    const date = shortDate(r.date).padEnd(10)
    return `${r.id.padEnd(10)} ${title} ${company} ${loc} ${date}`
  })
  return [header, "-".repeat(header.length), ...body].join("\n")
}

function renderPlain(rows: JobResult[]): string {
  if (rows.length === 0) return "No results."
  return rows
    .map(
      (r) =>
        `${r.title}\n  ${r.company || "—"} · ${r.location || "—"} · ${shortDate(r.date)}\n  id: ${r.id}\n  ${r.url}`,
    )
    .join("\n\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const province = resolveProvince(opts.location)
    const wfh = opts.remote === "remote"
    const hybridwork = opts.remote === "hybrid"
    const limit = opts.limit !== undefined && opts.limit >= 0 ? opts.limit : 20

    const filter = {
      keyword: opts.query,
      province,
      page: opts.page,
      lang: opts.lang,
      jobtype: opts.jobtype,
      wfh: wfh || undefined,
      hybridwork: hybridwork || undefined,
    }

    const { total, items } = await fetchSearchPage(filter, "UPDATED_AT_DESC")
    let rows = items
      .map((item) => toSearchResult(item, opts.lang))
      .filter((r) => withinJobAge(r.date, opts.jobage))

    if (limit >= 0) rows = rows.slice(0, limit)

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
