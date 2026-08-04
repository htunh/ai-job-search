# JobThai — URL & API Reference

Portal: [jobthai.com](https://www.jobthai.com) (Thailand's major Thai/English job board)

## GraphQL API (primary)

```
POST https://api.jobthai.com/v1/graphql
Content-Type: application/json
Origin: https://www.jobthai.com
```

### Search: `searchJobs`

```graphql
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
        tags
      }
    }
  }
}
```

**JobsSearchFilter fields** (from site JS `JOB_LIST`):

| Field | Type | Description |
|-------|------|-------------|
| `keyword` | string | Free-text job title / skill query |
| `province` | string | Province code, e.g. `01` = Bangkok |
| `page` | int | 1-indexed page (20 results per page) |
| `l` | string | Language: `en` or `th` |
| `jobtype` | string | Category ID: `10` = IT/Computer, `7` = Engineering |
| `subjobtype` | string | Sub-category ID |
| `salarymin` / `salarymax` | int | Monthly salary in THB |
| `wfh` | bool | Work from home only |
| `hybridwork` | bool | Hybrid work only |
| `onlineInterview` | bool | Online interview offered |
| `region` | string | Region code (`1`–`6`) |
| `district` / `subdistrict` | string | District/subdistrict codes |
| `orderBy` | string | Passed separately: `UPDATED_AT_DESC`, `SALARY_ASC`, `SALARY_DESC` |

**Province codes (common):**

| Code | Province |
|------|----------|
| `01` | Bangkok |
| `09` | Chon Buri |
| `10` | Chiang Mai |
| `99` | Overseas |

No server-side recency filter — the CLI applies `--jobage` client-side on `updatedAt`.

### Detail: `getJobRawData`

```graphql
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
}
```

## Job URL pattern

```
https://www.jobthai.com/en/job/{id}
https://www.jobthai.com/th/job/{id}
```

## robots.txt

`Allow: /` for general crawlers. Some bot user-agents are disallowed from `/resume/` paths only. No explicit block on job search or detail pages.

Use for **personal job search only** — keep request volume low.

## Quirks

- Search is backed by GraphQL, not HTML — no browser/headless required.
- GraphQL introspection is disabled in production.
- `province` is a **string** code, not an array.
- Default page size is ~20 results; no `limit` parameter on the API (CLI caps client-side).
- Many postings are Thai-language; use `-l en` and English keywords for international employers.
- Company names in search results may be Thai script even when `l=en`.
