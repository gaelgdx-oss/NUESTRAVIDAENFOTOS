export async function GET(request) {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) {
    return Response.json(
      {
        error:
          "Falta YOUTUBE_API_KEY. Agrégala en .env.local o en Vercel para buscar música en YouTube. Mientras tanto puedes subir un archivo de audio.",
        results: [],
      },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(request.url)
  const q = String(searchParams.get("q") || "").trim()
  if (!q) {
    return Response.json({ results: [] })
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/search")
  url.searchParams.set("part", "snippet")
  url.searchParams.set("type", "video")
  url.searchParams.set("maxResults", "12")
  url.searchParams.set("q", q)
  url.searchParams.set("key", key)

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 0 } })
    const data = await res.json()

    if (!res.ok) {
      const message =
        data?.error?.message ||
        "No se pudo buscar en YouTube. Revisa la API key o la cuota."
      return Response.json({ error: message, results: [] }, { status: 502 })
    }

    const results = (data.items || [])
      .map((item) => ({
        videoId: item?.id?.videoId,
        title: item?.snippet?.title || "Sin título",
        channel: item?.snippet?.channelTitle || "",
        thumbnail:
          item?.snippet?.thumbnails?.medium?.url ||
          item?.snippet?.thumbnails?.default?.url ||
          "",
      }))
      .filter((r) => r.videoId)

    return Response.json({ results })
  } catch (err) {
    return Response.json(
      { error: err?.message || "Error de red al buscar en YouTube", results: [] },
      { status: 500 }
    )
  }
}
