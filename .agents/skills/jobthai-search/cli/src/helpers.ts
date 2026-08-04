// Data source: JobThai (jobthai.com) public GraphQL API at api.jobthai.com/v1/graphql

export const GRAPHQL_URL = "https://api.jobthai.com/v1/graphql"
export const JOB_URL_BASE_EN = "https://www.jobthai.com/en/job"
export const JOB_URL_BASE_TH = "https://www.jobthai.com/th/job"

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

export interface JobResult {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  description?: string | null
  salary?: string | null
  employmentType?: string | null
}

/** Map common location names to JobThai province codes. */
const PROVINCE_CODES: Record<string, string> = {
  bangkok: "01",
  "กรุงเทพ": "01",
  "กรุงเทพมหานคร": "01",
  "chon buri": "09",
  "chiang mai": "10",
  overseas: "99",
  remote: "99",
}

export function resolveProvince(input: string | undefined): string | undefined {
  if (!input) return undefined
  const trimmed = input.trim()
  if (/^\d{2}$/.test(trimmed)) return trimmed
  const key = trimmed.toLowerCase()
  return PROVINCE_CODES[key] ?? trimmed
}

export function jobUrl(id: string, lang: "en" | "th" = "en"): string {
  const base = lang === "th" ? JOB_URL_BASE_TH : JOB_URL_BASE_EN
  return `${base}/${id}`
}

export function normalizeId(input: string): string | null {
  const url = input.match(/\/job\/(\d+)/)
  if (url) return url[1]
  if (/^\d+$/.test(input)) return input
  return null
}

function locationLabel(
  province?: { name?: string | null } | null,
  district?: { name?: string | null } | null,
): string | null {
  const parts = [district?.name, province?.name].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : null
}

export interface SearchJobItem {
  id: number
  jobTitle?: string | null
  companyName?: string | null
  province?: { name?: string | null } | null
  district?: { name?: string | null } | null
  salary?: string | null
  updatedAt?: string | null
  jobType?: { id?: number | null; name?: string | null } | null
}

export function toSearchResult(item: SearchJobItem, lang: "en" | "th" = "en"): JobResult {
  return {
    id: String(item.id),
    title: item.jobTitle ?? "(untitled)",
    company: item.companyName ?? null,
    location: locationLabel(item.province, item.district),
    date: item.updatedAt ?? null,
    url: jobUrl(String(item.id), lang),
    salary: item.salary ?? null,
    employmentType: item.jobType?.name ?? null,
  }
}

export function withinJobAge(dateIso: string | null | undefined, jobageDays: number): boolean {
  if (!jobageDays || jobageDays >= 9999) return true
  if (!dateIso) return true
  const posted = new Date(dateIso)
  if (Number.isNaN(posted.getTime())) return true
  const cutoff = Date.now() - jobageDays * 24 * 60 * 60 * 1000
  return posted.getTime() >= cutoff
}

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

/** POST GraphQL with exponential backoff on 429/5xx. */
export async function graphqlFetch<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T | null> {
  const maxRetries = 6
  let delay = 500
  const body = JSON.stringify({ query, variables })

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        "Content-Type": "application/json",
        Origin: "https://www.jobthai.com",
        Referer: "https://www.jobthai.com/",
      },
      body,
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

    const json = (await response.json()) as GraphQLResponse<T>
    if (json.errors?.length) {
      throw new Error(json.errors.map((e) => e.message).join("; "))
    }
    return json.data ?? null
  }

  throw new Error("Request failed after max retries")
}

const SEARCH_QUERY = `
query ($searchJobsFilter: JobsSearchFilter, $orderBy: JobOrderBy) {
  searchJobs(filter: $searchJobsFilter, orderBy: $orderBy) {
    data {
      total
      data {
        id
        jobTitle
        companyName
        province { name }
        district { name }
        salary
        updatedAt
        jobType { id name }
      }
    }
  }
}`

const DETAIL_QUERY = `
query ($id: Int!, $l: Language) {
  getJobRawData(id: $id, l: $l, isJobbuffer: false) {
    data {
      _id
      title
      description
      benefit
      company { name }
      workLocation {
        province { name }
        district { name }
      }
      updatedAt
      applyMethod
    }
  }
}`

export interface SearchFilter {
  keyword?: string
  province?: string
  page: number
  lang: "en" | "th"
  jobtype?: string
  wfh?: boolean
  hybridwork?: boolean
  salarymin?: number
  salarymax?: number
}

export async function fetchSearchPage(
  filter: SearchFilter,
  orderBy: string,
): Promise<{ total: number; items: SearchJobItem[] }> {
  const searchJobsFilter: Record<string, unknown> = {
    page: filter.page,
    l: filter.lang,
  }
  if (filter.keyword) searchJobsFilter.keyword = filter.keyword
  if (filter.province) searchJobsFilter.province = filter.province
  if (filter.jobtype) searchJobsFilter.jobtype = filter.jobtype
  if (filter.wfh) searchJobsFilter.wfh = true
  if (filter.hybridwork) searchJobsFilter.hybridwork = true
  if (filter.salarymin !== undefined) searchJobsFilter.salarymin = filter.salarymin
  if (filter.salarymax !== undefined) searchJobsFilter.salarymax = filter.salarymax

  const data = await graphqlFetch<{
    searchJobs: { data: { total: number; data: SearchJobItem[] } }
  }>(SEARCH_QUERY, { searchJobsFilter, orderBy })

  const block = data?.searchJobs?.data
  return {
    total: block?.total ?? 0,
    items: block?.data ?? [],
  }
}

export interface DetailRaw {
  _id: number
  title?: string | null
  description?: string | null
  benefit?: string | null
  company?: { name?: string | null } | null
  workLocation?: {
    province?: { name?: string | null } | null
    district?: { name?: string | null } | null
  } | null
  updatedAt?: string | null
  applyMethod?: string | null
}

export async function fetchJobDetail(id: string, lang: "en" | "th"): Promise<DetailRaw | null> {
  const data = await graphqlFetch<{ getJobRawData: { data: DetailRaw | null } }>(DETAIL_QUERY, {
    id: parseInt(id, 10),
    l: lang,
  })
  return data?.getJobRawData?.data ?? null
}

export function detailToJobResult(raw: DetailRaw, lang: "en" | "th"): JobResult {
  const descParts = [raw.description, raw.benefit ? `Benefits:\n${raw.benefit}` : null].filter(
    Boolean,
  )
  return {
    id: String(raw._id),
    title: raw.title ?? "(untitled)",
    company: raw.company?.name ?? null,
    location: locationLabel(raw.workLocation?.province, raw.workLocation?.district),
    date: raw.updatedAt ?? null,
    url: jobUrl(String(raw._id), lang),
    description: descParts.length > 0 ? descParts.join("\n\n") : null,
    employmentType: raw.applyMethod ?? null,
  }
}
