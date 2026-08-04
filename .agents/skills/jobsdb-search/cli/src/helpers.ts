// Data source: JobsDB Thailand (th.jobsdb.com) public search API + HTML detail pages.
// Search returns JSON; detail parses the jobAdDetails block from HTML.

export const SEARCH_URL = "https://th.jobsdb.com/api/jobsearch/v5/search"
export const JOB_URL_BASE = "https://th.jobsdb.com/th/job"
export const SITE_KEY = "TH-TH"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

/** Fetch JSON with exponential backoff on 429/5xx. Returns null on 404. */
export async function jsonFetch<T>(url: string): Promise<T | null> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        "Accept-Language": "en-TH,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return (await response.json()) as T
  }
  throw new Error("Request failed after max retries")
}

/** Fetch HTML with exponential backoff on 429/5xx. Returns "" on 404. */
export async function htmlFetch(url: string): Promise<string> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-TH,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return ""
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.text()
  }
  throw new Error("Request failed after max retries")
}

export interface JobResult {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  description?: string | null
  workArrangement?: string | null
  salary?: string | null
  employmentType?: string | null
}

interface JobsDbLocation {
  label?: string
}

interface JobsDbWorkArrangement {
  displayText?: string
}

export interface JobsDbSearchItem {
  id: string
  title: string
  companyName?: string
  listingDate?: string
  locations?: JobsDbLocation[]
  teaser?: string
  bulletPoints?: string[]
  workArrangements?: { displayText?: string; data?: Array<{ label?: { text?: string } }> }
  salaryLabel?: string
  workTypes?: string[]
}

export interface JobsDbSearchResponse {
  data?: JobsDbSearchItem[]
  totalCount?: number
}

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  return decodeHtmlEntities(stripTags(withBreaks)).replace(/\n{3,}/g, "\n\n").trim()
}

function locationLabel(locations?: JobsDbLocation[]): string | null {
  if (!locations || locations.length === 0) return null
  return locations.map((l) => l.label).filter(Boolean).join("; ") || null
}

function workArrangementText(item: JobsDbSearchItem): string | null {
  if (item.workArrangements?.displayText) return item.workArrangements.displayText
  const labels = item.workArrangements?.data?.map((d) => d.label?.text).filter(Boolean)
  return labels && labels.length > 0 ? labels.join(", ") : null
}

function summaryDescription(item: JobsDbSearchItem): string | null {
  const parts: string[] = []
  if (item.teaser) parts.push(item.teaser)
  if (item.bulletPoints?.length) {
    parts.push(item.bulletPoints.map((b) => `• ${b}`).join("\n"))
  }
  return parts.length > 0 ? parts.join("\n\n") : null
}

/** Map a search API item to the standard result shape. */
export function toSearchResult(item: JobsDbSearchItem): JobResult {
  return {
    id: item.id,
    title: item.title,
    company: item.companyName ?? null,
    location: locationLabel(item.locations),
    date: item.listingDate ?? null,
    url: `${JOB_URL_BASE}/${item.id}`,
    description: summaryDescription(item),
    workArrangement: workArrangementText(item),
    salary: item.salaryLabel || null,
    employmentType: item.workTypes?.join(", ") ?? null,
  }
}

/** Parse job ID from a JobsDB URL or bare numeric ID. */
export function normalizeId(input: string): string | null {
  const url = input.match(/\/job\/(\d+)/)
  if (url) return url[1]
  if (/^\d+$/.test(input)) return input
  return null
}

/**
 * Extract the inner HTML of a block identified by a data-automation attribute,
 * handling nested <div> elements by tracking tag depth.
 */
export function extractAutomationBlock(html: string, automation: string): string | null {
  const openRe = new RegExp(
    `<div[^>]*data-automation="${automation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`,
    "i",
  )
  const open = openRe.exec(html)
  if (!open) return null

  let i = open.index + open[0].length
  let depth = 1

  while (depth > 0 && i < html.length) {
    const nextOpen = html.indexOf("<div", i)
    const nextClose = html.indexOf("</div>", i)
    if (nextClose === -1) return null
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++
      i = nextOpen + 4
    } else {
      depth--
      i = nextClose + 6
    }
  }

  return html.slice(open.index + open[0].length, i - 6)
}

/** Parse the full job description from a detail page HTML response. */
export function parseJobDetailHtml(html: string, id: string): JobResult {
  const descHtml = extractAutomationBlock(html, "jobAdDetails")
  const description = descHtml ? htmlToText(descHtml) || null : null

  const titleMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)
  let title = titleMatch ? decodeHtmlEntities(titleMatch[1]) : "(untitled)"
  title = title.replace(/\s+Job in\s+.+$/i, "").trim()

  const companyMatch = html.match(/"companyName"\s*:\s*"((?:\\.|[^"\\])*)"/)
  const company = companyMatch ? decodeHtmlEntities(JSON.parse(`"${companyMatch[1]}"`)) : null

  return {
    id,
    title,
    company,
    location: null,
    date: null,
    url: `${JOB_URL_BASE}/${id}`,
    description,
  }
}

/** Map job-age in days to JobsDB's dateRange parameter. */
export function jobageToDateRange(days: number): string | null {
  if (!days || days <= 0 || days >= 9999) return null
  const allowed = [1, 3, 7, 14, 30]
  const match = allowed.find((d) => days <= d)
  return match ? String(match) : "30"
}

/** Workplace-type flag: onsite=1, hybrid=2, remote=3. */
export function workTypeFlag(mode: string | undefined): string | null {
  switch ((mode || "").toLowerCase()) {
    case "remote":
      return "3"
    case "hybrid":
      return "2"
    case "onsite":
    case "on-site":
      return "1"
    default:
      return null
  }
}

export function buildSearchUrl(opts: {
  query?: string
  location?: string
  jobage: number
  remote?: string
  page: number
  pageSize: number
  jobId?: string
}): string {
  const params = new URLSearchParams()
  params.set("siteKey", SITE_KEY)
  if (opts.jobId) {
    params.set("jobId", opts.jobId)
  } else {
    if (opts.query) params.set("keywords", opts.query)
    if (opts.location) params.set("where", opts.location)
    const dr = jobageToDateRange(opts.jobage)
    if (dr) params.set("dateRange", dr)
    const wa = workTypeFlag(opts.remote)
    if (wa) params.set("workarrangement", wa)
    params.set("page", String(opts.page))
    params.set("pageSize", String(opts.pageSize))
  }
  return `${SEARCH_URL}?${params.toString()}`
}
