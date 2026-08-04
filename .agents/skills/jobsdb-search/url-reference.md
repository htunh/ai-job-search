# JobsDB Thailand — URL & API Reference

Portal: [th.jobsdb.com](https://th.jobsdb.com) (JobsDB Thailand, part of SEEK)

## Search API (primary)

```
GET https://th.jobsdb.com/api/jobsearch/v5/search
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `siteKey` | yes | Always `TH-TH` |
| `keywords` | no | Free-text job title / skill query |
| `where` | no | Location text, e.g. `Bangkok`, `Remote` |
| `page` | no | 1-indexed page number (default 1) |
| `pageSize` | no | Results per page (default 20) |
| `dateRange` | no | Posted within N days: `1`, `3`, `7`, `14`, `30` |
| `workarrangement` | no | `1` = on-site, `2` = hybrid, `3` = remote |
| `jobId` | no | Fetch a single job by ID (detail shortcut) |

Response shape:

```json
{
  "data": [ { "id", "title", "companyName", "listingDate", "locations", "teaser", "bulletPoints", "workArrangements", "salaryLabel", "workTypes" } ],
  "totalCount": 530
}
```

Field notes:
- `listingDate` — ISO 8601 UTC timestamp
- `locations[].label` — human-readable location string
- `workArrangements.displayText` — `Hybrid`, `Remote`, or empty for on-site
- `teaser` + `bulletPoints[]` — short summary (not the full description)

## Job detail page (HTML)

```
GET https://th.jobsdb.com/th/job/{id}
```

Full job description lives in the HTML block:

```html
<div data-automation="jobAdDetails">…</div>
```

The page is client-rendered but the description block is present in the initial HTML response (no browser required). Parse with regex/DOM-free extraction.

Single-job metadata can also be fetched via the search API with `jobId={id}` (returns one item in `data[]`).

## Job URL pattern

```
https://th.jobsdb.com/th/job/{id}
```

## robots.txt restrictions

`robots.txt` disallows:
- `/api/jobsearch/`
- `*/job/`

Use for **personal job search only** — keep request volume low.

## Quirks

- Cloudflare may block bare `curl` on HTML pages; the CLI uses a browser User-Agent and `Accept-Language: en-TH,en`.
- The search JSON API is generally accessible without Cloudflare challenges.
- `where=Remote` returns remote-eligible roles; combine with `workarrangement=3` for strictly remote.
- `dateRange` is the recency filter (not `jobage` — mapped client-side to `dateRange`).
