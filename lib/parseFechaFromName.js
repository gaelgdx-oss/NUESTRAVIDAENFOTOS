/**
 * Parse DD-MM-YYYY (optional " (n)" suffix) from a filename into YYYY-MM-DD.
 * Falls back to today's date when invalid/missing.
 *
 * IMPORTANT: filenames use day-month-year (Latin America), NOT US month-day-year.
 * Example: 01-02-2026 = 1 de febrero de 2026 → 2026-02-01
 */
export function parseFechaFromName(fileName) {
  const today = localTodayYmd()
  if (!fileName) return today

  const base = String(fileName).split(/[/\\]/).pop() || ""
  // Strict: DD-MM-YYYY at the start of the basename
  const match = base.match(/^(\d{2})-(\d{2})-(\d{4})/)
  if (!match) {
    // Also allow the date anywhere in the name (same order DD-MM-YYYY)
    const anywhere = base.match(/(\d{2})-(\d{2})-(\d{4})/)
    if (!anywhere) return today
    return ymdFromDmy(anywhere[1], anywhere[2], anywhere[3]) || today
  }

  return ymdFromDmy(match[1], match[2], match[3]) || today
}

function localTodayYmd() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function ymdFromDmy(ddStr, mmStr, yyyyStr) {
  const day = Number(ddStr)
  const month = Number(mmStr)
  const year = Number(yyyyStr)

  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null

  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  // Always emit ISO for <input type="date">: YYYY-MM-DD
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** Format YYYY-MM-DD as "01/02/2026 — 1 de febrero de 2026" for UI clarity */
export function formatFechaEs(ymd) {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ""
  const [y, m, d] = ymd.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  if (Number.isNaN(date.getTime())) return ""
  const dd = String(d).padStart(2, "0")
  const mm = String(m).padStart(2, "0")
  const long = date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  return `${dd}/${mm}/${y} — ${long}`
}

export function createBulkItem(file, extras = {}) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const previewUrl = URL.createObjectURL(file)
  return {
    id,
    file,
    previewUrl,
    fecha: parseFechaFromName(file.name),
    ubicacion: "",
    nota: "",
    audioMode: "none",
    localAudioFile: null,
    audioTrim: null,
    youtube: null,
    trim: extras.trim || null,
    error: null,
  }
}
