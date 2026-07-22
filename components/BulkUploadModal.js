"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Calendar,
  Heart,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageSquare,
  Music,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import MusicPicker from "./MusicPicker"
import { createBulkItem } from "@/lib/parseFechaFromName"

const isVideoName = (name) => {
  if (!name) return false
  return [".mp4", ".webm", ".ogg", ".mov", ".quicktime", ".m4v", ".3gp"].some(
    (ext) => name.toLowerCase().includes(ext)
  )
}

export default function BulkUploadModal({
  files = [],
  initialTrim = null,
  uploading = false,
  uploadProgress = 0,
  uploadStatus = "",
  onClose,
  onUpload,
}) {
  const [items, setItems] = useState([])
  const [musicItemId, setMusicItemId] = useState(null)

  useEffect(() => {
    const next = files.map((file, idx) =>
      createBulkItem(file, {
        trim: idx === 0 ? initialTrim : null,
      })
    )
    setItems(next)
    return () => {
      next.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files])

  const updateItem = (id, patch) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
  }

  const removeItem = (id) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((i) => i.id !== id)
    })
  }

  const musicTarget = items.find((i) => i.id === musicItemId)

  const handleMusicConfirm = (payload) => {
    if (!musicItemId) return
    if (payload.source === "youtube") {
      updateItem(musicItemId, {
        audioMode: "youtube",
        youtube: {
          videoId: payload.videoId,
          title: payload.name,
          thumbnail: payload.thumbnail,
          startTime: payload.startTime || 0,
        },
        localAudioFile: null,
        audioTrim: { startTime: payload.startTime || 0 },
      })
    } else if (payload.source === "local") {
      updateItem(musicItemId, {
        audioMode: "local",
        localAudioFile: payload.file,
        audioTrim: { startTime: payload.startTime || 0 },
        youtube: null,
      })
    }
    setMusicItemId(null)
  }

  const clearMusic = (id) => {
    updateItem(id, {
      audioMode: "none",
      localAudioFile: null,
      audioTrim: null,
      youtube: null,
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !uploading && onClose?.()}
          className="absolute inset-0 bg-romantic-900/50 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 16 }}
          className="relative bg-white rounded-[28px] sm:rounded-[36px] shadow-2xl w-full max-w-5xl max-h-[94vh] overflow-hidden flex flex-col"
        >
          <div className="bg-romantic-500 px-5 sm:px-6 py-4 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-5 h-5 shrink-0" />
              <div className="min-w-0">
                <h3 className="font-black text-lg truncate">Subida masiva</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                  {items.length} recuerdo{items.length === 1 ? "" : "s"} · fecha, nota y música por foto
                </p>
              </div>
            </div>
            {!uploading && (
              <button
                type="button"
                onClick={onClose}
                className="hover:bg-white/20 p-2 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {items.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-16">
                No hay archivos en el lote.
              </p>
            )}

            {items.map((item, index) => {
              const video = isVideoName(item.file?.name)
              const musicLabel =
                item.audioMode === "youtube"
                  ? item.youtube?.title || "YouTube"
                  : item.audioMode === "local"
                    ? item.localAudioFile?.name || "Audio local"
                    : null

              return (
                <div
                  key={item.id}
                  className="rounded-[24px] border border-romantic-100 bg-romantic-50/40 p-3 sm:p-4 flex flex-col sm:flex-row gap-4"
                >
                  <div className="relative w-full sm:w-36 h-40 sm:h-36 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                    {video ? (
                      <video
                        src={item.previewUrl}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.previewUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                    <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-black px-2 py-1 rounded-full">
                      {index + 1}/{items.length}
                    </span>
                    {!uploading && items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="absolute top-2 right-2 bg-white/90 text-red-500 p-1.5 rounded-full shadow"
                        title="Quitar del lote"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span className="truncate">{item.file?.name}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-romantic-400 uppercase ml-1 tracking-wider">
                          Fecha (del nombre)
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="date"
                            disabled={uploading}
                            value={item.fecha}
                            onChange={(e) =>
                              updateItem(item.id, { fecha: e.target.value })
                            }
                            className="w-full bg-white border-none rounded-xl py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-romantic-300"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-romantic-400 uppercase ml-1 tracking-wider">
                          ¿Dónde fue?
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            disabled={uploading}
                            placeholder="Lugar..."
                            value={item.ubicacion}
                            onChange={(e) =>
                              updateItem(item.id, { ubicacion: e.target.value })
                            }
                            className="w-full bg-white border-none rounded-xl py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-romantic-300"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-romantic-400 uppercase ml-1 tracking-wider">
                        Descripción / nota
                      </label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <textarea
                          disabled={uploading}
                          placeholder="Escribe algo que no quieras olvidar..."
                          value={item.nota}
                          onChange={(e) =>
                            updateItem(item.id, { nota: e.target.value })
                          }
                          className="w-full bg-white border-none rounded-xl py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-romantic-300 min-h-[72px] resize-none"
                        />
                      </div>
                    </div>

                    {!video && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => setMusicItemId(item.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide border-2 border-dashed transition-all ${
                            musicLabel
                              ? "border-romantic-200 bg-white text-romantic-600"
                              : "border-gray-200 text-gray-400 hover:border-romantic-200 hover:text-romantic-500"
                          }`}
                        >
                          <Music className="w-3.5 h-3.5" />
                          {musicLabel ? "Cambiar música" : "Añadir música"}
                        </button>
                        {musicLabel && (
                          <>
                            <span className="text-[11px] text-romantic-500 font-bold truncate max-w-[220px]">
                              🎵 {musicLabel}
                            </span>
                            <button
                              type="button"
                              disabled={uploading}
                              onClick={() => clearMusic(item.id)}
                              className="text-[10px] font-bold text-gray-400 hover:text-red-400 uppercase"
                            >
                              Quitar
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="shrink-0 border-t border-romantic-50 p-4 sm:p-5 bg-white">
            <button
              type="button"
              disabled={uploading || items.length === 0}
              onClick={() => onUpload?.(items)}
              className="w-full bg-romantic-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-romantic-200 hover:bg-romantic-600 transition-all active:scale-[0.98] disabled:opacity-70 flex flex-col items-center justify-center gap-1"
            >
              {uploading ? (
                <>
                  <div className="flex items-center gap-2 px-4 text-center">
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                    <span className="text-sm">{uploadStatus || "Subiendo..."}</span>
                  </div>
                  <div className="w-full max-w-md h-2 bg-white/30 rounded-full mt-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-white"
                    />
                  </div>
                  <span className="text-[10px] font-bold opacity-90">
                    {uploadProgress}%
                  </span>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  <span>
                    Subir todo ({items.length}{" "}
                    {items.length === 1 ? "recuerdo" : "recuerdos"})
                  </span>
                </div>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {musicTarget && (
        <MusicPicker
          onCancel={() => setMusicItemId(null)}
          onConfirm={handleMusicConfirm}
        />
      )}
    </>
  )
}
