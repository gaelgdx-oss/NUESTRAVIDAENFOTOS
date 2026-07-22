"use client"

import { useEffect, useRef } from "react"

let ytApiPromise = null

function loadYouTubeApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"))
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (ytApiPromise) return ytApiPromise

  ytApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === "function") previous()
      resolve(window.YT)
    }
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script")
      tag.id = "youtube-iframe-api"
      tag.src = "https://www.youtube.com/iframe_api"
      document.body.appendChild(tag)
    } else if (window.YT?.Player) {
      resolve(window.YT)
    }
  })

  return ytApiPromise
}

/**
 * Hidden YouTube player that loops ~30s of audio from startTime.
 */
export default function YouTubeAudioPlayer({
  videoId,
  startTime = 0,
  clipSeconds = 30,
  active = true,
}) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const loopRef = useRef(null)

  useEffect(() => {
    if (!active || !videoId) return undefined

    let cancelled = false

    const clearLoop = () => {
      if (loopRef.current) {
        clearInterval(loopRef.current)
        loopRef.current = null
      }
    }

    const startLoop = (player) => {
      clearLoop()
      loopRef.current = setInterval(() => {
        try {
          const t = player.getCurrentTime?.() ?? 0
          if (t >= startTime + clipSeconds) {
            player.seekTo(startTime, true)
            player.playVideo()
          }
        } catch (_e) {
          /* ignore */
        }
      }, 500)
    }

    ;(async () => {
      try {
        const YT = await loadYouTubeApi()
        if (cancelled || !containerRef.current) return

        if (playerRef.current?.destroy) {
          try {
            playerRef.current.destroy()
          } catch (_e) {
            /* ignore */
          }
          playerRef.current = null
        }

        containerRef.current.innerHTML = ""
        const mount = document.createElement("div")
        containerRef.current.appendChild(mount)

        playerRef.current = new YT.Player(mount, {
          height: "0",
          width: "0",
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            start: Math.floor(startTime),
          },
          events: {
            onReady: (event) => {
              if (cancelled) return
              try {
                event.target.seekTo(startTime, true)
                event.target.setVolume(80)
                event.target.playVideo()
                startLoop(event.target)
              } catch (_e) {
                /* ignore */
              }
            },
            onStateChange: (event) => {
              if (cancelled) return
              if (event.data === YT.PlayerState.ENDED) {
                event.target.seekTo(startTime, true)
                event.target.playVideo()
              }
            },
          },
        })
      } catch (_e) {
        /* ignore */
      }
    })()

    return () => {
      cancelled = true
      clearLoop()
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy()
        } catch (_e) {
          /* ignore */
        }
        playerRef.current = null
      }
    }
  }, [videoId, startTime, clipSeconds, active])

  if (!active || !videoId) return null

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
    />
  )
}

export function isYouTubeAudio(audio) {
  return Boolean(audio && (audio.source === "youtube" || audio.videoId))
}
