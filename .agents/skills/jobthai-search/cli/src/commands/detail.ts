import {
  detailToJobResult,
  fetchJobDetail,
  normalizeId,
  writeError,
} from "../helpers.js"

export interface DetailOpts {
  id: string
  lang: "en" | "th"
  format: "json" | "plain"
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  if (!id) {
    writeError(`Could not parse a job ID from "${opts.id}"`, "BAD_ID")
    return 1
  }

  try {
    const raw = await fetchJobDetail(id, opts.lang)
    if (!raw) {
      writeError("Job not found", "NOT_FOUND")
      return 1
    }
    const job = detailToJobResult(raw, opts.lang)

    if (opts.format === "plain") {
      const lines = [
        job.title,
        `${job.company || "—"} · ${job.location || "—"} · ${job.date ? job.date.slice(0, 10) : "—"}`,
        "",
        job.description || "(no description)",
        "",
        `URL: ${job.url}`,
      ]
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
