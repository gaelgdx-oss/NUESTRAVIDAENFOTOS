/**
 * Parse DD-MM-YYYY (optional " (n)" suffix) from a filename into YYYY-MM-DD.
 * Falls back to today's date when invalid/missing.
 */
export function parseFechaFromName(fileName) {
  const today = new Date().toISOString().split("T")[0]
  if (!fileName) return today

  const base = String(fileName).split(/[/\\]/).pop() || ""
  const match = base.match(/(\d{2})-(\d{2})-(\d{4})/)
  if (!match) return today

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])

  if (month < 1 || month > 12 || day < 1 || day > 31) return today

  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return today
  }

  const mm = String(month).padStart(2, "0")
  const dd = String(day).padStart(2, "0")
  return `${year}-${mm}-${dd}`
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
