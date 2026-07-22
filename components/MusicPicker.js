"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import {
  Check,
  Clock,
  Loader2,
  Music,
  Play,
  Search,
  Upload,
  X,
  Youtube,
} from "lucide-react"
import MusicSelector from "./MusicSelector"

function formatTime(seconds) {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, "0")}`
}

function YouTubeClipPicker({ video, onConfirm, onBack }) {
  const [startTime, setStartTime] = useState(0)
  const iframeRef = useRef(null)

  useEffect(() => {
    // Reload embed when start changes (simple preview)
    if (iframeRef.current) {
      iframeRef.current.src = `https://www.youtube.com/embed/${video.videoId}?start=${Math.floor(startTime)}&autoplay=1&controls=1&rel=0&modestbranding=1`
    }
  }, [video.videoId, startTime])

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-bold text-romantic-500 hover:underline"
      >
        ← Volver a resultados
      </button>

      <div className="overflow-hidden rounded-2xl bg-black aspect-video">
        <iframe
          ref={iframeRef}
          title={video.title}
          className="h-full w-full"
          allow="autoplay; encrypted-media"
          src={`https://www.youtube.com/embed/${video.videoId}?start=${Math.floor(startTime)}&autoplay=1&controls=1&rel=0&modestbranding=1`}
        />
      </div>

      <div>
        <p className="text-sm font-bold text-gray-800 line-clamp-2">{video.title}</p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-romantic-400 mt-1">
          Fragmento: {formatTime(startTime)} – {formatTime(startTime + 30)}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> Inicio del clip (30s)
          </span>
          <span>{formatTime(startTime)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={600}
          step={1}
          value={startTime}
          onChange={(e) => setStartTime(Number(e.target.value))}
          className="w-full accent-romantic-500"
        />
      </div>

      <button
        type="button"
        onClick={() =>
          onConfirm({
            source: "youtube",
            videoId: video.videoId,
            name: video.title,
            thumbnail: video.thumbnail,
            startTime,
          })
        }
        className="w-full bg-romantic-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-romantic-200 hover:bg-romantic-600 transition-all flex items-center justify-center gap-2"
      >
        <Check className="w-5 h-5" />
        Usar esta música
      </button>
    </div>
  )
}

/**
 * Tabs: YouTube search | Local file upload
 * onConfirm(payload):
 *   - youtube: { source:'youtube', videoId, name, thumbnail, startTime }
 *   - local: { source:'local', file, startTime, duration }
 */
export default function MusicPicker({ onConfirm, onCancel }) {
  const [tab, setTab] = useState("youtube")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [localFile, setLocalFile] = useState(null)
  const fileRef = useRef(null)

  const searchYouTube = async (e) => {
    e?.preventDefault?.()
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError("")
    setSelectedVideo(null)
    try {
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (data.error && (!data.results || data.results.length === 0)) {
        setError(data.error)
        setResults([])
      } else {
        setResults(data.results || [])
        if (data.error) setError(data.error)
      }
    } catch (err) {
      setError(err?.message || "Error al buscar")
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  if (localFile) {
    return (
      <MusicSelector
        file={localFile}
        onConfirm={(data) => {
          onConfirm({
            source: "local",
            file: localFile,
            startTime: data.startTime || 0,
            duration: data.duration,
          })
        }}
        onCancel={() => setLocalFile(null)}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 sm:p-8">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[32px] overflow-hidden max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <Music className="text-romantic-500 w-5 h-5" />
            Música para este recuerdo
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex gap-2 px-6 pt-4">
          <button
            type="button"
            onClick={() => setTab("youtube")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 ${
              tab === "youtube"
                ? "bg-romantic-500 text-white shadow-md"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            <Youtube className="w-4 h-4" />
            YouTube
          </button>
          <button
            type="button"
            onClick={() => setTab("local")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 ${
              tab === "local"
                ? "bg-romantic-500 text-white shadow-md"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            <Upload className="w-4 h-4" />
            Archivo
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {tab === "youtube" && (
            <>
              {selectedVideo ? (
                <YouTubeClipPicker
                  video={selectedVideo}
                  onBack={() => setSelectedVideo(null)}
                  onConfirm={onConfirm}
                />
              ) : (
                <>
                  <form onSubmit={searchYouTube} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Busca una canción o artista..."
                        className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-romantic-300"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !query.trim()}
                      className="px-4 rounded-2xl bg-romantic-500 text-white font-bold disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        "Buscar"
                      )}
                    </button>
                  </form>

                  {error && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-2xl p-3">
                      {error}
                    </p>
                  )}

                  <div className="space-y-2">
                    {results.map((r) => (
                      <button
                        key={r.videoId}
                        type="button"
                        onClick={() => setSelectedVideo(r)}
                        className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-romantic-50 transition-colors text-left"
                      >
                        {r.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.thumbnail}
                            alt=""
                            className="w-20 h-12 object-cover rounded-xl bg-gray-100"
                          />
                        ) : (
                          <div className="w-20 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                            <Play className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-800 line-clamp-2">
                            {r.title}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium truncate">
                            {r.channel}
                          </p>
                        </div>
                      </button>
                    ))}
                    {!loading && results.length === 0 && !error && (
                      <p className="text-center text-xs text-gray-400 py-8">
                        Busca una canción como en WhatsApp, o sube un archivo en la otra pestaña.
                      </p>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {tab === "local" && (
            <div className="space-y-4 py-6">
              <input
                ref={fileRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setLocalFile(f)
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-romantic-200 rounded-[28px] py-16 flex flex-col items-center gap-3 text-romantic-500 hover:bg-romantic-50 transition-colors"
              >
                <Upload className="w-8 h-8" />
                <span className="text-sm font-black uppercase tracking-wide">
                  Subir MP3 / audio
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  Luego eliges los 30 segundos
                </span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
