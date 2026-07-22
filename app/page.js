/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Heart, 
  Upload, 
  Download, 
  Lock, 
  Plus, 
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Calendar,
  MapPin,
  MessageSquare,
  X,
  Clock,
  ChevronRight,
  ChevronLeft,
  Trash2,
  LogOut,
  Eye,
  EyeOff,
  Pencil,
  Save,
  CheckCircle2,
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Share2,
  BookHeart,
  PenLine,
  MessageCircleHeart,
  History,
  Activity,
  Smartphone,
  Mail,
  Globe2,
  Clock as ClockIcon,
  Users
} from "lucide-react"
import JSZip from "jszip"
import { saveAs } from "file-saver"
import { UAParser } from "ua-parser-js"
import confetti from "canvas-confetti"
import HeartRain from "@/components/HeartRain"
import VideoPlayer from "@/components/VideoPlayer"
import VideoTrimmer from "@/components/VideoTrimmer"
import MusicPicker from "@/components/MusicPicker"
import BulkUploadModal from "@/components/BulkUploadModal"
import YouTubeAudioPlayer, { isYouTubeAudio } from "@/components/YouTubeAudioPlayer"

const isVideo = (url) => {
  if (!url) return false
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.quicktime', '.m4v', '.3gp']
  return videoExtensions.some(ext => url.toLowerCase().includes(ext))
}

const isAdminUser = (user) => {
  if (!user) return false

  const adminEmails = String(process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  const adminPhones = String(process.env.NEXT_PUBLIC_ADMIN_PHONES || "")
    .split(",")
    .map((s) => s.replace(/\D/g, ""))
    .filter(Boolean)

  const email = String(user.email || "").toLowerCase()
  const phone = String(user.user_metadata?.phone || "")
  const phoneDigits = phone.replace(/\D/g, "")

  if (email && adminEmails.includes(email)) return true
  if (phoneDigits && adminPhones.includes(phoneDigits)) return true
  return false
}

const isNativePlatform = () => {
  const cap = globalThis?.Capacitor
  if (!cap) return false
  if (typeof cap.isNativePlatform === "function") return Boolean(cap.isNativePlatform())
  if (typeof cap.getPlatform === "function") return cap.getPlatform() !== "web"
  return false
}

const withTimeout = async (promise, ms, label) => {
  let timerId
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timerId = setTimeout(() => {
          reject(new Error(`${label} tardó demasiado. Revisa tu internet o prueba con un archivo más pequeño.`))
        }, ms)
      }),
    ])
  } finally {
    if (timerId) clearTimeout(timerId)
  }
}

export default function Home() {
  const [imagenes, setImagenes] = useState([])
  const [authorized, setAuthorized] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [recuerdoDelDia, setRecuerdoDelDia] = useState(null)
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ fecha: '', ubicacion: '', nota: '' })
  const [updating, setUpdating] = useState(false)
  const [vistas, setVistas] = useState([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState("")
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadStatus, setDownloadStatus] = useState("")
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [generatedVideoBlob, setGeneratedVideoBlob] = useState(null)
  const [trimmingFile, setTrimmingFile] = useState(null)
  const [trimData, setTrimData] = useState(null) // { startTime, endTime }
  const [selectedAudioFile, setSelectedAudioFile] = useState(null)
  const [audioTrimData, setAudioTrimData] = useState(null)
  const [youtubeEditAudio, setYoutubeEditAudio] = useState(null)
  const [showMusicModal, setShowMusicModal] = useState(false)
  const [activeTab, setActiveTab] = useState('album') // 'album' o 'diario'
  const [diario, setDiario] = useState([])
  const [expandedDeviceKey, setExpandedDeviceKey] = useState(null)
  const [showDiarioModal, setShowDiarioModal] = useState(false)
  const [notaData, setNotaData] = useState({ autor: '', contenido: '' })
  const [enviandoNota, setEnviandoNota] = useState(false)
  const [selectedNota, setSelectedNota] = useState(null)
  const [sharingType, setSharingType] = useState('video') // 'video' o 'image'
  
  // States for analytics / tracking
  const [sessionId, setSessionId] = useState(null)
  const [vistasSession, setVistasSession] = useState(new Set())
  const [todasLasVisitas, setTodasLasVisitas] = useState([])
  const [visitasFoto, setVisitasFoto] = useState([])
  
  const audioRef = useRef(null)
  
  // Historias destacadas del día (cerca de la fecha actual de años anteriores)
  const [historiasDelDia, setHistoriasDelDia] = useState([])
  const [showDayStoriesModal, setShowDayStoriesModal] = useState(false)
  const [currentDayStoryIdx, setCurrentDayStoryIdx] = useState(0)
  
  // Sort stories: newest first (keep "vista" only for styling)
  const historiasOrdenadas = [...imagenes]
    .sort((a, b) => {
      const ta = a?.created_at ? new Date(a.created_at).getTime() : new Date(a.fecha).getTime()
      const tb = b?.created_at ? new Date(b.created_at).getTime() : new Date(b.fecha).getTime()
      return tb - ta
    })
    .slice(0, 15)
  
  // Auth states
  const [currentUser, setCurrentUser] = useState(null)
  const [authMode, setAuthMode] = useState("login") // 'login' | 'register'
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [registerFirstName, setRegisterFirstName] = useState("")
  const [registerLastName, setRegisterLastName] = useState("")
  const [registerPhone, setRegisterPhone] = useState("")
  const [authError, setAuthError] = useState("")
  const [authInfo, setAuthInfo] = useState("")
  const [authLoading, setAuthLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadData, setUploadData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    ubicacion: "",
    nota: ""
  })

  const [timeTogether, setTimeTogether] = useState({
    noOficial: { days: 0, hours: 0, minutes: 0, seconds: 0 },
    oficial: { days: 0, hours: 0, minutes: 0, seconds: 0 }
  })

  const fileInputRef = useRef(null)

  useEffect(() => {
    setIsClient(true)
    
    // Check for seen stories
    const savedVistas = localStorage.getItem("historias_vistas")
    if (savedVistas) {
      setVistas(JSON.parse(savedVistas))
    }

    const applySessionState = (session) => {
      const user = session?.user || null
      setCurrentUser(user)
      setAuthorized(Boolean(user))
      setIsAdmin(isAdminUser(user))
      if (!user) {
        sessionStorage.removeItem("visita_session_id")
        sessionStorage.removeItem("visita_session_start")
        setSessionId(null)
        setVistasSession(new Set())
      }
    }

    const initAuth = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        applySessionState(sessionData?.session || null)
      } finally {
        setAuthReady(true)
      }
    }

    initAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") {
        if (session?.user) {
          applySessionState(session)
          setAuthReady(true)
        }
        return
      }

      applySessionState(session)
      setAuthReady(true)
    })

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])
  
  // Pausar música automáticamente al editar o generar video
  useEffect(() => {
    if (isEditing || isGeneratingVideo) {
      if (audioRef.current) audioRef.current.pause()
    }
  }, [isEditing, isGeneratingVideo])

  // Lógica para historias del día (cerca de la fecha actual de años anteriores)
  useEffect(() => {
    if (imagenes.length > 0) {
      const hoy = new Date()
      const diaActual = hoy.getDate()
      const mesActual = hoy.getMonth()
      
      const destacadas = imagenes.filter(img => {
        const fechaImg = new Date(img.fecha + "T00:00:00")
        const diaImg = fechaImg.getDate()
        const mesImg = fechaImg.getMonth()
        const anioImg = fechaImg.getFullYear()
        
        // No mostrar historias de este año (solo pasadas)
        if (anioImg === hoy.getFullYear()) return false
        
        // Historias cerca de la fecha (+- 3 días)
        const diffDias = Math.abs(diaImg - diaActual)
        return mesImg === mesActual && diffDias <= 3
      })
      
      setHistoriasDelDia(destacadas)
    }
  }, [imagenes])

  const marcarComoVista = (id) => {
    if (!vistas.includes(id)) {
      const nuevasVistas = [...vistas, id]
      setVistas(nuevasVistas)
      localStorage.setItem("historias_vistas", JSON.stringify(nuevasVistas))
    }
  }

  const esNueva = (fechaSubida) => {
    if (!fechaSubida) return false
    const subida = new Date(fechaSubida)
    const ahora = new Date()
    const diffHours = (ahora - subida) / (1000 * 60 * 60)
    return diffHours <= 48 // Considerar nueva si se subió hace menos de 48h
  }

  // --- ANALYTICS TRACKING ---
  function getDeviceModel(userAgent) {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    
    if (result.device.vendor && result.device.model) {
      return `${result.device.vendor} ${result.device.model}`;
    } else if (result.os.name === 'Windows') {
      return "Windows PC";
    } else if (result.os.name === 'Mac OS') {
      return "Mac OS";
    } else if (result.device.model) {
      return result.device.model;
    } else if (result.os.name === 'Android') {
      return "Android";
    } else if (result.os.name === 'iOS') {
      return "iPhone/iPad";
    }
    
    return "Dispositivo";
  }

  async function getLocation() {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data.city) return `${data.city}, ${data.country_name}`;
      return "Ubicación Desconocida";
    } catch (e) {
      return "Ubicación Desconocida";
    }
  }

  async function iniciarSesionVisita() {
    try {
      let currentSessionId = sessionStorage.getItem("visita_session_id");
      if (!currentSessionId) {
        const ubicacion = await getLocation();
        const deviceModel = getDeviceModel(navigator.userAgent);
        const first = String(currentUser?.user_metadata?.first_name || "").trim()
        const last = String(currentUser?.user_metadata?.last_name || "").trim()
        const fullName = `${first} ${last}`.trim()
        const phone = String(currentUser?.user_metadata?.phone || "").trim()
        const userLabel = fullName || phone || currentUser?.email || "Usuario";
        const dispositivo = `${userLabel} • ${deviceModel}`;
        
        const { data, error } = await supabase
          .from('visitas')
          .insert([{
            dispositivo,
            ubicacion
          }])
          .select()
          .single();
          
        if (data && !error) {
          sessionStorage.setItem("visita_session_id", data.id);
          sessionStorage.setItem("visita_session_start", Date.now().toString());
          setSessionId(data.id);
        } else {
          console.error("Error al registrar visita:", error);
        }
      } else {
        setSessionId(currentSessionId);
      }
    } catch(e) {
      console.warn("Analytics no disponible");
    }
  }

  useEffect(() => {
    if (selectedImage && sessionId) {
      setVistasSession(prev => {
        const next = new Set(prev);
        next.add(selectedImage.id);
        return next;
      });
      cargarVisitasFoto(selectedImage.id);
    }
  }, [selectedImage, sessionId]);

  async function cargarVisitasFoto(id) {
    try {
      const { data } = await supabase
        .from('visitas')
        .select('dispositivo, ubicacion, ultima_actividad')
        .contains('fotos_vistas', JSON.stringify([id]))
        .order('ultima_actividad', { ascending: false });
        
      if (data) {
        const unique = [];
        const devices = new Set();
        data.forEach(v => {
          if (!devices.has(v.dispositivo)) {
            devices.add(v.dispositivo);
            unique.push(v);
          }
        });
        setVisitasFoto(unique);
      }
    } catch (e) {
      console.warn("No se pudieron cargar visitas de la foto");
    }
  }

  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(async () => {
      try {
        const fotosArray = Array.from(vistasSession);
        let start = parseInt(sessionStorage.getItem("visita_session_start") || Date.now().toString());
        let duracion = Math.floor((Date.now() - start) / 1000);
        await supabase
          .from('visitas')
          .update({
            ultima_actividad: new Date().toISOString(),
            duracion_segundos: duracion,
            fotos_vistas: fotosArray
          })
          .eq('id', sessionId);
      } catch(e) {}
    }, 10000);
    return () => clearInterval(interval);
  }, [sessionId, vistasSession]);

  useEffect(() => {
    if (activeTab === 'estadisticas') {
      cargarEstadisticas();
    }
  }, [activeTab]);

  async function cargarEstadisticas() {
    try {
      const { data } = await supabase
        .from('visitas')
        .select('*')
        .order('ultima_actividad', { ascending: false })
        .limit(50);
      if (data) setTodasLasVisitas(data);
    } catch(e) {
      console.warn("Estadísticas no disponibles");
    }
  }

  function formatDurationSeconds(totalSeconds) {
    const s = Math.max(0, Number(totalSeconds || 0))
    const days = Math.floor(s / 86400)
    const hours = Math.floor((s % 86400) / 3600)
    const minutes = Math.floor((s % 3600) / 60)
    const seconds = Math.floor(s % 60)

    const parts = []
    if (days) parts.push(`${days}d`)
    if (hours || days) parts.push(`${hours}h`)
    if (minutes || hours || days) parts.push(`${minutes}m`)
    parts.push(`${seconds}s`)
    return parts.join(" ")
  }

  const visitasAgrupadas = (() => {
    const map = new Map()
    for (const visita of todasLasVisitas) {
      const key = String(visita?.dispositivo || "Dispositivo")
      const item = map.get(key) || {
        key,
        dispositivo: key,
        sesiones: [],
        totalSegundos: 0,
        ultimaActividadTs: 0,
        ultimaActividad: null,
        ubicacionesSet: new Set(),
        fotosVistasSet: new Set()
      }

      item.sesiones.push(visita)
      item.totalSegundos += Number(visita?.duracion_segundos || 0)

      const ts = visita?.ultima_actividad ? new Date(visita.ultima_actividad).getTime() : 0
      if (ts > item.ultimaActividadTs) {
        item.ultimaActividadTs = ts
        item.ultimaActividad = visita.ultima_actividad
      }

      if (visita?.ubicacion) item.ubicacionesSet.add(visita.ubicacion)
      const fotos = Array.isArray(visita?.fotos_vistas) ? visita.fotos_vistas : []
      for (const f of fotos) item.fotosVistasSet.add(f)

      map.set(key, item)
    }

    return Array.from(map.values())
      .map((g) => {
        const sesionesOrdenadas = [...g.sesiones].sort((a, b) => {
          const ta = a?.ultima_actividad ? new Date(a.ultima_actividad).getTime() : 0
          const tb = b?.ultima_actividad ? new Date(b.ultima_actividad).getTime() : 0
          return tb - ta
        })
        return {
          key: g.key,
          dispositivo: g.dispositivo,
          ultima_actividad: g.ultimaActividad,
          total_segundos: g.totalSegundos,
          sesiones: sesionesOrdenadas,
          sesiones_count: sesionesOrdenadas.length,
          ubicaciones: Array.from(g.ubicacionesSet),
          fotos_vistas_count: g.fotosVistasSet.size
        }
      })
      .sort((a, b) => {
        const ta = a?.ultima_actividad ? new Date(a.ultima_actividad).getTime() : 0
        const tb = b?.ultima_actividad ? new Date(b.ultima_actividad).getTime() : 0
        return tb - ta
      })
  })()
  // --- FIN ANALYTICS ---

  async function obtenerDiario() {
    try {
      const { data, error } = await supabase
        .from('diario')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setDiario(data || [])
    } catch (err) {
      console.error("Error cargando diario:", err)
    }
  }

  async function enviarNota(e) {
    if (e) e.preventDefault()
    if (!notaData.autor || !notaData.contenido) return
    
    setEnviandoNota(true)
    try {
      const { error } = await supabase
        .from('diario')
        .insert([notaData])
      
      if (error) throw error
      
      setNotaData({ autor: '', contenido: '' })
      setShowDiarioModal(false)
      obtenerDiario()
      
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#f84a7e', '#ffb6c1']
      })
    } catch (err) {
      alert("Error al guardar en el diario: " + err.message)
    } finally {
      setEnviandoNota(false)
    }
  }

  useEffect(() => {
    if (authorized) {
      obtenerImagenes()
      obtenerDiario()
      iniciarSesionVisita()
    }
  }, [authorized])

  useEffect(() => {
    if (!authorized) return

    let intervalId
    const run = () => {
      Promise.allSettled([
        obtenerImagenes(),
        obtenerDiario(),
        activeTab === "estadisticas" ? cargarEstadisticas() : Promise.resolve(),
      ]).catch(() => {})
    }

    intervalId = setInterval(run, 5 * 60 * 1000)

    let removeAppListener
    ;(async () => {
      if (!isNativePlatform()) return
      try {
        const mod = await import("@capacitor/app")
        const App = mod?.App
        if (!App?.addListener) return
        const handler = App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) run()
        })
        removeAppListener = () => handler?.remove?.()
      } catch (_e) {}
    })()

    return () => {
      if (intervalId) clearInterval(intervalId)
      if (removeAppListener) removeAppListener()
    }
  }, [authorized, activeTab])

  useEffect(() => {
    if (!authorized) return
    ;(async () => {
      if (!isNativePlatform()) return
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications")
        if (!LocalNotifications?.requestPermissions) return
        const perm = await LocalNotifications.requestPermissions()
        setNotificationsEnabled(perm?.display === "granted")
      } catch (_e) {}
    })()
  }, [authorized])

  useEffect(() => {
    if (!authorized) return

    const channel = supabase
      .channel("album-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "fotos" },
        async (payload) => {
          const row = payload?.new
          if (row?.id) {
            setImagenes((prev) => {
              const next = [row, ...prev]
              const seen = new Set()
              return next.filter((x) => {
                if (!x?.id) return false
                if (seen.has(x.id)) return false
                seen.add(x.id)
                return true
              })
            })
          } else {
            await obtenerImagenes()
          }

          if (isNativePlatform()) {
            try {
              const { LocalNotifications } = await import("@capacitor/local-notifications")
              if (notificationsEnabled) {
                await LocalNotifications.schedule({
                  notifications: [
                    {
                      id: Date.now(),
                      title: "Nuevo recuerdo ❤️",
                      body: "Se subió una nueva foto al álbum",
                      schedule: { at: new Date(Date.now() + 200) },
                    },
                  ],
                })
              }
            } catch (_e) {}
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "diario" },
        async (payload) => {
          const row = payload?.new
          if (row?.id) {
            setDiario((prev) => {
              const next = [row, ...prev]
              const seen = new Set()
              return next.filter((x) => {
                if (!x?.id) return false
                if (seen.has(x.id)) return false
                seen.add(x.id)
                return true
              })
            })
          } else {
            await obtenerDiario()
          }

          if (isNativePlatform()) {
            try {
              const { LocalNotifications } = await import("@capacitor/local-notifications")
              if (notificationsEnabled) {
                await LocalNotifications.schedule({
                  notifications: [
                    {
                      id: Date.now(),
                      title: "Nueva nota ❤️",
                      body: "Se escribió una nueva nota en el diario",
                      schedule: { at: new Date(Date.now() + 200) },
                    },
                  ],
                })
              }
            } catch (_e) {}
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [authorized, notificationsEnabled])

  useEffect(() => {
    if (selectedImage) {
      setEditForm({ 
        fecha: selectedImage.fecha, 
        ubicacion: selectedImage.ubicacion || "", 
        nota: selectedImage.nota || "" 
      })
      setIsEditing(false)
    }
  }, [selectedImage])

  useEffect(() => {
    if (imagenes.length > 0 && !recuerdoDelDia) {
      const randomIdx = Math.floor(Math.random() * imagenes.length)
      setRecuerdoDelDia(imagenes[randomIdx])
    }
  }, [imagenes, recuerdoDelDia])

  useEffect(() => {
    const audioMeta = selectedImage?.metadata?.audio
    if (!audioMeta || isYouTubeAudio(audioMeta)) {
      if (audioRef.current) audioRef.current.pause()
      return
    }
    if (audioRef.current && audioMeta.url) {
      audioRef.current.src = audioMeta.url
      audioRef.current.currentTime = audioMeta.startTime || 0
      audioRef.current.play().catch(() => {})

      const checkEnd = setInterval(() => {
        if (
          audioRef.current &&
          audioRef.current.currentTime >= (audioMeta.startTime || 0) + 30
        ) {
          audioRef.current.pause()
          audioRef.current.currentTime = audioMeta.startTime || 0
          audioRef.current.play().catch(() => {})
        }
      }, 1000)
      return () => clearInterval(checkEnd)
    }
  }, [selectedImage])

  useEffect(() => {
    if (selectedStoryIndex !== null) {
      const story = historiasOrdenadas[selectedStoryIndex]
      const audioMeta = story?.metadata?.audio
      if (!audioMeta || isYouTubeAudio(audioMeta)) {
        if (audioRef.current) audioRef.current.pause()
        return
      }
      if (audioRef.current && audioMeta.url) {
        audioRef.current.src = audioMeta.url
        audioRef.current.currentTime = audioMeta.startTime || 0
        audioRef.current.play().catch(() => {})
      }
    } else if (audioRef.current) {
      audioRef.current.pause()
    }
  }, [selectedStoryIndex])

  // Bloquear scroll cuando hay un modal abierto
  useEffect(() => {
    const isModalOpen = selectedImage !== null || 
                       selectedStoryIndex !== null || 
                       selectedNota !== null ||
                       showDayStoriesModal || 
                       showUploadModal || 
                       showDiarioModal || 
                       showMusicModal ||
                       downloadingAll ||
                       trimmingFile !== null ||
                       isGeneratingVideo;
    
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.overscrollBehavior = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
    };
  }, [selectedImage, selectedStoryIndex, showDayStoriesModal, showUploadModal, showDiarioModal, showMusicModal, trimmingFile, isGeneratingVideo, downloadingAll]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setAuthError("")
    setAuthInfo("")

    const email = String(authEmail || "").trim().toLowerCase()
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!ok) {
      setAuthError("Escribe un correo válido.")
      return
    }

    if (authPassword.length < 6) {
      setAuthError("La contraseña debe tener al menos 6 caracteres.")
      return
    }

    setAuthLoading(true)
    try {
      if (authMode === "register") {
        const firstName = String(registerFirstName || "").trim()
        const lastName = String(registerLastName || "").trim()
        const phoneDigits = String(registerPhone || "").replace(/\D/g, "")

        if (firstName.length < 2) {
          setAuthError("Escribe tu nombre.")
          return
        }
        if (lastName.length < 2) {
          setAuthError("Escribe tu apellido.")
          return
        }
        if (phoneDigits.length < 8) {
          setAuthError("Escribe tu número de celular.")
          return
        }

        const { error, data } = await supabase.auth.signUp({
          email,
          password: authPassword,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              phone: phoneDigits
            }
          }
        })

        if (error) {
          const msg = String(error.message || "").toLowerCase()
          if (msg.includes("user already registered") || msg.includes("already registered")) {
            setAuthMode("login")
            setAuthInfo("Ya existe una cuenta con ese correo. Inicia sesión.")
            return
          }
          throw error
        }

        if (!data?.session?.user) {
          setAuthError("Tu Supabase todavía tiene activada la confirmación de correo. Desactívala en Authentication → Settings → Confirm email para que puedas entrar sin correo.")
          return
        }
        setAuthInfo("Cuenta creada y sesión iniciada.")
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: authPassword
        })
        if (error) {
          const msg = String(error.message || "")
          if (msg.toLowerCase().includes("invalid login credentials")) {
            setAuthError("Contraseña incorrecta. Si no la recuerdas y no quieres correos, borra ese usuario en Supabase (Authentication → Users) y vuelve a registrarte con una contraseña nueva.")
            return
          }
          if (msg.toLowerCase().includes("email not confirmed")) {
            setAuthError("En Supabase está activada la confirmación de correo. Desactívala en Authentication → Settings → Confirm email para que puedas entrar sin correo.")
            return
          }
          throw error
        }
      }
    } catch (err) {
      setAuthError(err?.message || "No se pudo completar la autenticación.")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    sessionStorage.removeItem("visita_session_id")
    sessionStorage.removeItem("visita_session_start")
    setAuthorized(false)
    setIsAdmin(false)
    setCurrentUser(null)
    setImagenes([])
    setDiario([])
    setSessionId(null)
    setVistasSession(new Set())
    setSelectedImage(null)
    setSelectedStoryIndex(null)
    setSelectedNota(null)
  }

  useEffect(() => {
    const calculateTime = (startDate) => {
      const start = new Date(startDate)
      const now = new Date()
      const diff = now - start
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((diff / (1000 * 60)) % 60)
      const seconds = Math.floor((diff / 1000) % 60)
      
      return { days, hours, minutes, seconds }
    }

    const timer = setInterval(() => {
      setTimeTogether({
        noOficial: calculateTime('2025-12-15T00:00:00'),
        oficial: calculateTime('2026-02-14T00:00:00')
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  async function obtenerImagenes() {
    try {
      const { data, error } = await supabase
        .from("fotos")
        .select("*")
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) throw error
      // Asegurarnos de que las fechas sean correctas y añadir created_at si existe para 'esNueva'
      setImagenes(data || [])
    } catch (err) {
      console.error("Error fetching images:", err)
    }
  }

  const descargarCollage = async () => {
    if (historiasDelDia.length === 0) return
    const zip = new JSZip()
    const folder = zip.folder("nuestro-dia-especial")
    
    try {
      const downloadPromises = historiasDelDia.map(async (img, index) => {
        const response = await fetch(img.url)
        const blob = await response.blob()
        const ext = img.url.split('.').pop().split('?')[0]
        folder.file(`recuerdo-${img.fecha}-${index + 1}.${ext}`, blob)
      })

      await Promise.all(downloadPromises)
      const content = await zip.generateAsync({ type: "blob" })
      saveAs(content, "collage-nuestro-dia.zip")
      
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.7 },
        colors: ['#ff7da3', '#f84a7e', '#ffffff']
      })
    } catch (err) {
      alert("Error al descargar el collage")
    }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ""
    if (files.length === 0) return

    // Un solo video: mantener recorte; varios archivos (fotos/videos) → modal masivo
    if (files.length === 1 && isVideo(files[0].name)) {
      setTrimmingFile(files[0])
      return
    }

    setTrimData(null)
    setSelectedFiles(files)
    setShowUploadModal(true)
  }

  const handleConfirmTrim = (data) => {
    setTrimData(data)
    setSelectedFiles([data.blob || trimmingFile])
    setTrimmingFile(null)
    setShowUploadModal(true)
  }

  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target.result
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 1200
          const MAX_HEIGHT = 1200
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }))
          }, 'image/jpeg', 0.8)
        }
      }
    })
  }

  async function subirImagenes(bulkItems) {
    const items = Array.isArray(bulkItems) ? bulkItems : []
    if (items.length === 0) return

    const largeVideos = items.filter(
      (it) => isVideo(it.file?.name) && it.file?.size > 50 * 1024 * 1024
    )
    if (largeVideos.length > 0) {
      if (
        !confirm(
          `Has seleccionado ${largeVideos.length} video(s) muy grandes (más de 50MB). El almacenamiento gratuito de Supabase tiene un límite y podrían no subirse o tardar mucho. ¿Deseas intentarlo de todas formas?`
        )
      ) {
        return
      }
    }

    setUploading(true)
    setUploadProgress(0)
    setUploadStatus("Preparando tu lote...")

    const totalSteps = items.reduce(
      (sum, it) => sum + 2 + (it.audioMode === "local" && it.localAudioFile ? 1 : 0),
      0
    )
    let completedSteps = 0
    const bumpProgress = () => {
      if (!totalSteps) return
      completedSteps += 1
      setUploadProgress(
        Math.max(0, Math.min(100, Math.round((completedSteps / totalSteps) * 100)))
      )
    }

    const failed = []
    const native = isNativePlatform()

    try {
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx]
        const file = item.file
        const label = file?.name || `archivo ${idx + 1}`

        try {
          let metadata = {}
          if (item.trim) {
            const { blob, ...trimRest } = item.trim
            metadata.trim = trimRest
          } else if (trimData && items.length === 1) {
            const { blob, ...trimRest } = trimData
            metadata.trim = trimRest
          }

          if (item.audioMode === "local" && item.localAudioFile) {
            setUploadStatus(
              `Subiendo música ${idx + 1}/${items.length} — ${item.localAudioFile.name}`
            )
            const audioExt = item.localAudioFile.name.split(".").pop()
            const audioName = `musica/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${audioExt}`
            const { error: audioError } = await withTimeout(
              supabase.storage.from("fotos").upload(audioName, item.localAudioFile, {
                contentType: item.localAudioFile.type || undefined,
              }),
              180000,
              "La subida de la música"
            )
            if (audioError) throw audioError
            bumpProgress()
            const {
              data: { publicUrl: audioUrl },
            } = supabase.storage.from("fotos").getPublicUrl(audioName)
            metadata.audio = {
              source: "local",
              url: audioUrl,
              name: item.localAudioFile.name.replace(/\.[^/.]+$/, ""),
              startTime: item.audioTrim?.startTime || 0,
            }
          } else if (item.audioMode === "youtube" && item.youtube?.videoId) {
            metadata.audio = {
              source: "youtube",
              videoId: item.youtube.videoId,
              name: item.youtube.title || "YouTube",
              thumbnail: item.youtube.thumbnail || "",
              startTime: item.youtube.startTime || item.audioTrim?.startTime || 0,
            }
          }

          let fileToUpload = file
          const kind = isVideo(file.name) ? "video" : "foto"
          if (!isVideo(file.name) && file.type?.startsWith("image/")) {
            if (!native) {
              setUploadStatus(`Procesando ${kind} ${idx + 1}/${items.length} — ${label}`)
              try {
                fileToUpload = await withTimeout(
                  compressImage(file),
                  60000,
                  "El procesamiento de la foto"
                )
              } catch (_err) {
                fileToUpload = file
              }
            }
          }

          const fileExt = fileToUpload.name.split(".").pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
          setUploadStatus(`Subiendo ${kind} ${idx + 1}/${items.length} — ${label}`)
          const { error: uploadError } = await withTimeout(
            supabase.storage.from("fotos").upload(fileName, fileToUpload, {
              contentType: fileToUpload.type || undefined,
            }),
            180000,
            "La subida de la foto"
          )
          if (uploadError) throw uploadError
          bumpProgress()

          const {
            data: { publicUrl },
          } = supabase.storage.from("fotos").getPublicUrl(fileName)

          setUploadStatus(`Guardando detalles ${idx + 1}/${items.length}...`)
          const { data: insertedRow, error: dbError } = await supabase
            .from("fotos")
            .insert([
              {
                url: publicUrl,
                name: file.name,
                fecha: item.fecha,
                ubicacion: item.ubicacion || "",
                nota: item.nota || "",
                metadata: Object.keys(metadata).length > 0 ? metadata : null,
              },
            ])
            .select("*")
            .single()

          if (dbError) throw dbError
          bumpProgress()

          if (insertedRow?.id) {
            setImagenes((prev) => {
              const next = [insertedRow, ...prev]
              const seen = new Set()
              return next.filter((x) => {
                if (!x?.id) return false
                if (seen.has(x.id)) return false
                seen.add(x.id)
                return true
              })
            })
          }
        } catch (itemErr) {
          console.error("Item upload error:", itemErr)
          failed.push({ name: label, message: itemErr?.message || String(itemErr) })
          // Keep progress moving for remaining estimated steps of this item
          bumpProgress()
          bumpProgress()
        }
      }

      setUploadProgress(100)
      if (failed.length === 0) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#ff7da3", "#f84a7e", "#ffffff"],
        })
        setShowUploadModal(false)
        setSelectedFiles([])
        setTrimData(null)
        setUploadData({
          fecha: new Date().toISOString().split("T")[0],
          ubicacion: "",
          nota: "",
        })
        obtenerImagenes()
      } else if (failed.length < items.length) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: ["#ff7da3", "#f84a7e"],
        })
        alert(
          `Se subieron ${items.length - failed.length} de ${items.length}. Fallaron:\n` +
            failed.map((f) => `• ${f.name}: ${f.message}`).join("\n")
        )
        setShowUploadModal(false)
        setSelectedFiles([])
        setTrimData(null)
        obtenerImagenes()
      } else {
        alert(
          "No se pudo subir el lote:\n" +
            failed.map((f) => `• ${f.name}: ${f.message}`).join("\n")
        )
      }
    } catch (err) {
      console.error("Upload error:", err)
      alert("Error al subir: " + (err?.message || String(err)))
    } finally {
      setUploading(false)
      setUploadStatus("")
      setUploadProgress(0)
      setSelectedAudioFile(null)
      setAudioTrimData(null)
    }
  }

  async function actualizarImagen() {
    if (!isAdmin || !selectedImage) return
    setUpdating(true)
    try {
      let finalMetadata = { ...(selectedImage.metadata || {}) }

      if (youtubeEditAudio?.videoId) {
        finalMetadata.audio = {
          source: "youtube",
          videoId: youtubeEditAudio.videoId,
          name: youtubeEditAudio.name || "YouTube",
          thumbnail: youtubeEditAudio.thumbnail || "",
          startTime: youtubeEditAudio.startTime || 0,
        }
      } else if (selectedAudioFile) {
        const audioExt = selectedAudioFile.name.split(".").pop()
        const audioName = `musica/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${audioExt}`

        const { error: audioError } = await supabase.storage
          .from("fotos")
          .upload(audioName, selectedAudioFile)

        if (audioError) throw audioError

        const {
          data: { publicUrl: audioUrl },
        } = supabase.storage.from("fotos").getPublicUrl(audioName)

        finalMetadata.audio = {
          source: "local",
          url: audioUrl,
          name: selectedAudioFile.name.replace(/\.[^/.]+$/, ""),
          startTime: audioTrimData?.startTime || 0,
        }
      } else if (audioTrimData && selectedImage.metadata?.audio) {
        finalMetadata.audio = {
          ...selectedImage.metadata.audio,
          startTime: audioTrimData.startTime,
        }
      }

      const { error } = await supabase
        .from("fotos")
        .update({
          fecha: editForm.fecha,
          ubicacion: editForm.ubicacion,
          nota: editForm.nota,
          metadata: finalMetadata,
        })
        .eq("id", selectedImage.id)

      if (error) throw error

      setImagenes(
        imagenes.map((img) =>
          img.id === selectedImage.id
            ? { ...img, ...editForm, metadata: finalMetadata }
            : img
        )
      )
      setSelectedImage({ ...selectedImage, ...editForm, metadata: finalMetadata })
      setIsEditing(false)
      setSelectedAudioFile(null)
      setAudioTrimData(null)
      setYoutubeEditAudio(null)

      confetti({
        particleCount: 50,
        spread: 30,
        origin: { y: 0.8 },
        colors: ["#ff7da3", "#f84a7e"],
      })
    } catch (err) {
      alert("Error al actualizar: " + err.message)
    } finally {
      setUpdating(false)
    }
  }

  async function eliminarImagen(id, url) {
    if (!isAdmin) return
    if (!confirm("¿Estás seguro de que quieres eliminar este recuerdo para siempre? 🥺")) return

    setDeletingId(id)
    try {
      const fileName = url.split('/').pop()
      const { error: storageError } = await supabase.storage
        .from("fotos")
        .remove([fileName])
      
      if (storageError) console.warn("Error deleting from storage:", storageError)

      const { error: dbError } = await supabase
        .from("fotos")
        .delete()
        .eq('id', id)

      if (dbError) throw dbError

      setImagenes(imagenes.filter(img => img.id !== id))
      if (selectedImage?.id === id) setSelectedImage(null)
      if (recuerdoDelDia?.id === id) setRecuerdoDelDia(null)
      
    } catch (err) {
      alert("Error al eliminar: " + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  async function compartirNota(notaParaCompartir) {
    const nota = notaParaCompartir || selectedNota;
    if (!nota) return;

    setSharingType('image');
    setIsGeneratingVideo(true);
    setVideoProgress(20);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      // Square format is much better for quotes
      const size = 1080;
      canvas.width = size;
      canvas.height = size;

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Decoration: Soft Pink Circle
      ctx.fillStyle = '#fff5f7';
      ctx.beginPath();
      ctx.arc(size * 0.1, size * 0.1, size * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Quotation Marks
      ctx.fillStyle = '#f84a7e';
      ctx.font = 'bold 240px Georgia, serif';
      ctx.fillText('“', 80, 260);

      const margin = 100;
      const maxWidth = size - (margin * 2);
      
      // Dynamic Font Scaling
      const content = (nota.contenido || "").replace(/\r\n/g, "\n");
      let fontSize = 65; // Starting font size
      
      const getLines = (fSize) => {
        ctx.font = `italic ${fSize}px Georgia, serif`;
        const srcLines = content.split("\n");
        const resLines = [];

        srcLines.forEach((srcLine) => {
          if (srcLine.trim().length === 0) {
            resLines.push("");
            return;
          }

          const leadingSpaces = srcLine.match(/^\s+/)?.[0] || "";
          const text = srcLine.trim();
          const words = text.split(/\s+/);
          let currentLine = leadingSpaces;

          for (let n = 0; n < words.length; n++) {
            const word = words[n];
            const candidate =
              currentLine.trim().length === 0 ? `${leadingSpaces}${word}` : `${currentLine} ${word}`;

            if (ctx.measureText(candidate).width > maxWidth && currentLine.trim().length > 0) {
              resLines.push(currentLine);
              currentLine = `${leadingSpaces}${word}`;
            } else {
              currentLine = candidate;
            }
          }

          resLines.push(currentLine);
        });

        return resLines;
      };

      let lines = getLines(fontSize);
      // Max height for text area is roughly 550px
      const maxHeight = 580;
      while (lines.length * (fontSize * 1.3) > maxHeight && fontSize > 28) {
        fontSize -= 2;
        lines = getLines(fontSize);
      }

      setVideoProgress(60);

      // Draw Content
      ctx.fillStyle = '#1a1a1a';
      ctx.font = `italic ${fontSize}px Georgia, serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      const startY = 320;
      lines.forEach((line, i) => {
        if (line.length === 0) return;
        ctx.fillText(line, margin, startY + (i * fontSize * 1.3));
      });

      // Author & Date (Bottom Right)
      const infoY = startY + (lines.length * fontSize * 1.3) + 60;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 36px Arial, sans-serif';
      ctx.fillText(nota.autor.toUpperCase(), size - margin, infoY);
      
      ctx.fillStyle = '#f84a7e';
      ctx.font = 'bold 24px Arial, sans-serif';
      const fechaObj = new Date(nota.created_at);
      const dia = fechaObj.getDate();
      const mes = fechaObj.toLocaleDateString('es-ES', { month: 'long' });
      const anio = fechaObj.getFullYear();
      const hora = fechaObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      ctx.fillText(`${dia} DE ${mes.toUpperCase()}, ${anio} • ${hora}`, size - margin, infoY + 45);

      // Decoration: Corners or lines like the reference
      ctx.strokeStyle = '#f84a7e';
      ctx.lineWidth = 10;
      // Top Right Corner
      ctx.beginPath();
      ctx.moveTo(size - 80, 40);
      ctx.lineTo(size - 40, 40);
      ctx.lineTo(size - 40, 80);
      ctx.stroke();
      
      // Bottom Left Logo/Icon simulation
      ctx.fillStyle = '#f84a7e';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('❤', 40, size - 40);

      setVideoProgress(100);

      canvas.toBlob(async (blob) => {
        const file = new File([blob], `nuestro-diario-${Date.now()}.png`, { type: 'image/png' });
        
        try {
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Un pensamiento para ti ❤️',
              text: content.length > 140 ? `${content.substring(0, 140)}…` : content
            });
          } else {
            saveAs(blob, `nota-amor.png`);
          }
        } catch (err) {
          console.error("Share error:", err);
          saveAs(blob, `nota-amor.png`);
        } finally {
          setIsGeneratingVideo(false);
          setVideoProgress(0);
        }
      }, 'image/png');

    } catch (err) {
      console.error(err);
      alert("Error al generar la imagen");
      setIsGeneratingVideo(false);
    }
  }

  async function descargarTodo() {
    if (imagenes.length === 0 || downloadingAll) return
    const zip = new JSZip()
    const folder = zip.folder("nuestra-vida-juntos")

    setDownloadingAll(true)
    setDownloadProgress(0)
    setDownloadStatus("Preparando descarga...")

    try {
      for (let index = 0; index < imagenes.length; index++) {
        const img = imagenes[index]
        setDownloadStatus(`Descargando ${index + 1}/${imagenes.length}...`)
        try {
          const response = await fetch(img.url)
          const blob = await response.blob()
          const ext = (img.url.split(".").pop() || "jpg").split("?")[0]
          folder.file(`recuerdo-${img.fecha}-${index + 1}.${ext}`, blob)
        } catch (fileErr) {
          console.warn("Skip file download:", fileErr)
        }
        setDownloadProgress(
          Math.round(((index + 1) / (imagenes.length + 1)) * 100)
        )
      }

      setDownloadStatus("Creando ZIP...")
      const content = await zip.generateAsync({ type: "blob" }, (meta) => {
        const base = Math.round((imagenes.length / (imagenes.length + 1)) * 100)
        setDownloadProgress(
          Math.min(99, base + Math.round(((meta.percent || 0) / 100) * (100 / (imagenes.length + 1))))
        )
      })
      const stamp = new Date().toISOString().slice(0, 10)
      saveAs(content, `nuestra-vida-juntos-${stamp}.zip`)
      setDownloadProgress(100)
      setDownloadStatus("¡Listo!")

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })
    } catch (err) {
      alert("Error al descargar")
    } finally {
      setTimeout(() => {
        setDownloadingAll(false)
        setDownloadProgress(0)
        setDownloadStatus("")
      }, 600)
    }
  }

  async function compartirRecuerdo() {
    if (!selectedImage) return;
    setSharingType('video');
    setIsGeneratingVideo(true);
    setVideoProgress(0);

    try {
      // 1. Prepare Canvas (Portrait for Stories)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = 1080;
      const height = 1920; 
      canvas.width = width;
      canvas.height = height;

      // 2. Load Image
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = selectedImage.url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Error al cargar la imagen. Inténtalo de nuevo."));
      });

      // 3. Draw Background
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#fff5f7');
      gradient.addColorStop(1, '#ffffff');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // 4. White Card Area
      const cardPadding = 60;
      const cardY = 120;
      const cardWidth = width - (cardPadding * 2);
      const cardHeight = height - (cardY * 2);
      
      ctx.shadowColor = 'rgba(248, 74, 126, 0.15)';
      ctx.shadowBlur = 40;
      ctx.fillStyle = '#ffffff';
      
      // Rounded Card (Simple)
      const radius = 60;
      ctx.beginPath();
      ctx.moveTo(cardPadding + radius, cardY);
      ctx.arcTo(cardPadding + cardWidth, cardY, cardPadding + cardWidth, cardY + cardHeight, radius);
      ctx.arcTo(cardPadding + cardWidth, cardY + cardHeight, cardPadding, cardY + cardHeight, radius);
      ctx.arcTo(cardPadding, cardY + cardHeight, cardPadding, cardY, radius);
      ctx.arcTo(cardPadding, cardY, cardPadding + cardWidth, cardY, radius);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 5. Draw Image (Top part of card)
      const displayImgHeight = cardHeight * 0.65;
      const scale = Math.max(cardWidth / img.width, displayImgHeight / img.height);
      const ix = cardPadding + (cardWidth - img.width * scale) / 2;
      const iy = cardY + (displayImgHeight - img.height * scale) / 2;
      
      ctx.save();
      ctx.beginPath();
      ctx.rect(cardPadding, cardY, cardWidth, displayImgHeight);
      ctx.clip();
      ctx.drawImage(img, ix, iy, img.width * scale, img.height * scale);
      ctx.restore();

      // 6. Draw Content (Bottom part of card)
      const textStart = cardY + displayImgHeight + 80;
      
      // Date Helper
      const fechaObj = new Date(selectedImage.fecha + "T00:00:00");
      const dia = fechaObj.getDate();
      const mes = fechaObj.toLocaleDateString('es-ES', { month: 'long' });
      const anio = fechaObj.getFullYear();

      // Draw Date Circle/Badge
      ctx.fillStyle = '#f84a7e';
      ctx.beginPath();
      ctx.arc(cardPadding + 80, textStart + 40, 40, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(dia, cardPadding + 80, textStart + 52);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 35px Arial';
      ctx.fillText(`${mes.toUpperCase()} ${anio}`, cardPadding + 140, textStart + 35);
      
      ctx.fillStyle = '#f84a7e';
      ctx.font = 'bold 25px Arial';
      ctx.fillText(selectedImage.ubicacion || 'NUESTRO CORAZÓN', cardPadding + 140, textStart + 75);

      // Quote / Note
      ctx.fillStyle = '#4b5563';
      ctx.font = 'italic 45px Arial';
      const words = (selectedImage.nota || 'Un momento inolvidable...').split(' ');
      let line = '';
      let lineY = textStart + 180;
      const maxWidth = cardWidth - 160;
      
      for(let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, cardPadding + 80, lineY);
          line = words[n] + ' ';
          lineY += 65;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, cardPadding + 80, lineY);

      // Music Indicator
      if (selectedImage.metadata?.audio) {
        const musicY = cardY + cardHeight - 120;
        ctx.fillStyle = 'rgba(248, 74, 126, 0.05)';
        ctx.fillRect(cardPadding, musicY - 60, cardWidth, 120);
        
        ctx.fillStyle = '#f84a7e';
        ctx.font = 'bold 28px Arial';
        ctx.fillText("🎵 " + (selectedImage.metadata.audio.name || "Nuestra canción especial").substring(0, 40), cardPadding + 80, musicY + 10);
      }

      // 7. Render Loop and Recording Setup
      const chunks = [];
      const videoStream = canvas.captureStream(30);
      
      // Determine support for MIME types
      const types = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm', 'video/vp8'];
      const mimeType = types.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

      let audioStream = null;
      let audioEl = null;
      let audioCtx = null;

      if (selectedImage.metadata?.audio) {
        try {
          audioEl = new Audio(selectedImage.metadata.audio.url);
          audioEl.crossOrigin = "anonymous";
          audioEl.currentTime = selectedImage.metadata.audio.startTime || 0;
          
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const source = audioCtx.createMediaElementSource(audioEl);
          const destination = audioCtx.createMediaStreamDestination();
          source.connect(destination);
          source.connect(audioCtx.destination);
          audioStream = destination.stream;
          
          await audioEl.play();
        } catch (audioErr) {
          console.error("Audio error during sharing:", audioErr);
        }
      }

      if (audioStream) {
        audioStream.getAudioTracks().forEach(track => videoStream.addTrack(track));
      }

      const recorder = new MediaRecorder(videoStream, { 
        mimeType,
        videoBitsPerSecond: 5000000 
      });
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setGeneratedVideoBlob(blob);
      };

      // 8. Start Recording with Render Loop
      recorder.start();
      
      const recordDuration = 10000; // 10 seconds
      const startTime = Date.now();
      
      const render = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / recordDuration, 1);
        
        // Redraw content every frame to keep stream alive
        // Background
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Card
        ctx.shadowColor = 'rgba(248, 74, 126, 0.15)';
        ctx.shadowBlur = 40;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        const r = 60;
        if (ctx.roundRect) {
          ctx.roundRect(cardPadding, cardY, cardWidth, cardHeight, r);
        } else {
          // Fallback for older browsers
          ctx.moveTo(cardPadding + r, cardY);
          ctx.arcTo(cardPadding + cardWidth, cardY, cardPadding + cardWidth, cardY + cardHeight, r);
          ctx.arcTo(cardPadding + cardWidth, cardY + cardHeight, cardPadding, cardY + cardHeight, r);
          ctx.arcTo(cardPadding, cardY + cardHeight, cardPadding, cardY, r);
          ctx.arcTo(cardPadding, cardY, cardPadding + cardWidth, cardY, r);
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // Image
        ctx.save();
        ctx.beginPath();
        ctx.rect(cardPadding, cardY, cardWidth, displayImgHeight);
        ctx.clip();
        ctx.drawImage(img, ix, iy, img.width * scale, img.height * scale);
        ctx.restore();

        // Date Badge
        ctx.fillStyle = '#f84a7e';
        ctx.beginPath();
        ctx.arc(cardPadding + 80, textStart + 40, 40, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(dia, cardPadding + 80, textStart + 52);

        // Texts
        ctx.textAlign = 'left';
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 35px Arial';
        ctx.fillText(`${mes.toUpperCase()} ${anio}`, cardPadding + 140, textStart + 35);
        
        ctx.fillStyle = '#f84a7e';
        ctx.font = 'bold 25px Arial';
        ctx.fillText(selectedImage.ubicacion || 'NUESTRO CORAZÓN', cardPadding + 140, textStart + 75);

        // Quote
        ctx.fillStyle = '#4b5563';
        ctx.font = 'italic 45px Arial';
        let line = '';
        let currentY = textStart + 180;
        const words = (selectedImage.nota || 'Un momento inolvidable...').split(' ');
        for(let n = 0; n < words.length; n++) {
          let testLine = line + words[n] + ' ';
          if (ctx.measureText(testLine).width > (cardWidth - 160) && n > 0) {
            ctx.fillText(line, cardPadding + 80, currentY);
            line = words[n] + ' ';
            currentY += 65;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, cardPadding + 80, currentY);

        // Music Indicator (INSIDE RENDER LOOP)
        if (selectedImage.metadata?.audio) {
          const musicY = cardY + cardHeight - 120;
          ctx.fillStyle = 'rgba(248, 74, 126, 0.05)';
          ctx.fillRect(cardPadding, musicY - 60, cardWidth, 120);
          
          ctx.fillStyle = '#f84a7e';
          ctx.font = 'bold 28px Arial';
          ctx.textAlign = 'left';
          ctx.fillText("🎵 " + (selectedImage.metadata.audio.name || "Nuestra canción especial").substring(0, 40), cardPadding + 80, musicY + 10);
        }

        // Progress indicator for progress bar
        setVideoProgress(Math.floor(progress * 100));

        if (progress < 1) {
          requestAnimationFrame(render);
        } else {
          recorder.stop();
          if (audioEl) {
            audioEl.pause();
            audioEl.currentTime = 0;
          }
          if (audioCtx) audioCtx.close();
        }
      };

      requestAnimationFrame(render);

    } catch (err) {
      console.error("Video generation error:", err);
      alert("No se pudo generar el vídeo. " + err.message);
      setIsGeneratingVideo(false);
    }
  }

  const handleShareVideo = async () => {
    if (!generatedVideoBlob || !selectedImage) return;
    
    const fechaObj = new Date(selectedImage.fecha + "T00:00:00");
    const label = `nuestro-recuerdo-${fechaObj.getDate()}.webm`;
    const file = new File([generatedVideoBlob], label, { type: 'video/webm' });

    try {
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Nuestro Recuerdo ❤️',
          text: '❤️ Hecho con amor para ti'
        });
      } else {
        saveAs(generatedVideoBlob, label);
      }
    } catch (err) {
      console.error("Share error:", err);
      saveAs(generatedVideoBlob, label);
    }
  }

  if (!isClient) return null

  if (!authReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-romantic-50 p-6 text-center">
        <HeartRain />
        <div className="bg-white p-10 rounded-[40px] shadow-2xl max-w-md w-full border border-romantic-100 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 text-romantic-100 rotate-12">
            <Heart className="w-24 h-24 fill-current" />
          </div>
          <div className="absolute -bottom-10 -left-10 text-romantic-50 -rotate-12">
            <Heart className="w-32 h-32 fill-current" />
          </div>

          <div className="relative z-10">
            <div className="bg-romantic-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Loader2 className="text-romantic-500 w-10 h-10 animate-spin" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-800 mb-2">Nuestra Vida Juntos</h1>
            <p className="text-gray-500 text-sm font-medium">Cargando tu sesión...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-romantic-50 p-6 text-center">
        <HeartRain />
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-10 rounded-[40px] shadow-2xl max-w-md w-full border border-romantic-100 relative overflow-hidden"
        >
          {/* Decorative hearts */}
          <div className="absolute -top-6 -right-6 text-romantic-100 rotate-12">
            <Heart className="w-24 h-24 fill-current" />
          </div>
          <div className="absolute -bottom-10 -left-10 text-romantic-50 -rotate-12">
            <Heart className="w-32 h-32 fill-current" />
          </div>

          <div className="relative z-10">
            <div className="bg-romantic-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Lock className="text-romantic-500 w-10 h-10" />
            </div>
            
            <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Nuestra Vida Juntos</h1>
            <p className="text-gray-500 mb-8 text-sm">Inicia sesión o crea una cuenta para ver nuestros recuerdos ❤️</p>
            
            <div className="flex bg-romantic-50/60 rounded-2xl p-1 border border-romantic-100 mb-5">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login")
                  setAuthError("")
                  setAuthInfo("")
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                  authMode === "login" ? "bg-white text-romantic-600 shadow-sm" : "text-gray-500"
                }`}
              >
                INICIAR SESIÓN
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register")
                  setAuthError("")
                  setAuthInfo("")
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                  authMode === "register" ? "bg-white text-romantic-600 shadow-sm" : "text-gray-500"
                }`}
              >
                REGISTRARME
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === "register" && (
                <>
                  <div className="relative group">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-romantic-300 group-focus-within:text-romantic-500 transition-colors" />
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={registerFirstName}
                      onChange={(e) => setRegisterFirstName(e.target.value)}
                      className="w-full bg-romantic-50/50 border-2 border-romantic-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-romantic-400 focus:bg-white transition-all"
                      autoComplete="given-name"
                    />
                  </div>

                  <div className="relative group">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-romantic-300 group-focus-within:text-romantic-500 transition-colors" />
                    <input
                      type="text"
                      placeholder="Apellido"
                      value={registerLastName}
                      onChange={(e) => setRegisterLastName(e.target.value)}
                      className="w-full bg-romantic-50/50 border-2 border-romantic-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-romantic-400 focus:bg-white transition-all"
                      autoComplete="family-name"
                    />
                  </div>

                  <div className="relative group">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-romantic-300 group-focus-within:text-romantic-500 transition-colors" />
                    <input
                      type="tel"
                      inputMode="tel"
                      placeholder="Celular"
                      value={registerPhone}
                      onChange={(e) => setRegisterPhone(e.target.value)}
                      className="w-full bg-romantic-50/50 border-2 border-romantic-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-romantic-400 focus:bg-white transition-all"
                      autoComplete="tel"
                    />
                  </div>
                </>
              )}

              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-romantic-300 group-focus-within:text-romantic-500 transition-colors" />
                <input
                  type="email"
                  inputMode="email"
                  placeholder="Correo (ej: tu@correo.com)"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-romantic-50/50 border-2 border-romantic-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-romantic-400 focus:bg-white transition-all"
                  autoFocus
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-romantic-300 group-focus-within:text-romantic-500 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-romantic-50/50 border-2 border-romantic-100 rounded-2xl py-4 pl-12 pr-12 text-sm focus:outline-none focus:border-romantic-400 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-romantic-300 hover:text-romantic-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={authLoading}
                className="w-full bg-romantic-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-romantic-200 hover:bg-romantic-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>PROCESANDO...</span>
                  </>
                ) : (
                  <>
                    <span>{authMode === "register" ? "CREAR CUENTA" : "ENTRAR AL ÁLBUM"}</span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </form>

            {authError && (
              <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs font-bold mt-4">
                {authError}
              </motion.p>
            )}
            {authInfo && (
              <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-romantic-600 text-xs font-bold mt-4">
                {authInfo}
              </motion.p>
            )}
          </div>
        </motion.div>
        
        <p className="mt-8 text-romantic-300 text-[10px] uppercase tracking-[0.2em] font-bold">Un lugar solo para nosotros dos</p>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-romantic-50 pb-20">
      <HeartRain />
      <audio ref={audioRef} className="hidden" />
      {selectedImage && isYouTubeAudio(selectedImage.metadata?.audio) && selectedStoryIndex === null && (
        <YouTubeAudioPlayer
          videoId={selectedImage.metadata.audio.videoId}
          startTime={selectedImage.metadata.audio.startTime || 0}
          active
        />
      )}
      {selectedStoryIndex !== null &&
        isYouTubeAudio(historiasOrdenadas[selectedStoryIndex]?.metadata?.audio) && (
          <YouTubeAudioPlayer
            videoId={historiasOrdenadas[selectedStoryIndex].metadata.audio.videoId}
            startTime={
              historiasOrdenadas[selectedStoryIndex].metadata.audio.startTime || 0
            }
            active
          />
        )}
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-romantic-100 px-4 sm:px-6 xl:px-12 py-4">
        <div className="w-full flex items-center justify-between">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-11 h-11 rounded-full overflow-hidden shadow-lg border-2 border-white flex items-center justify-center bg-white">
               <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-110" />
            </div>
            <h1 className="text-xl font-black text-gray-800 hidden sm:block tracking-tighter">Nuestra Vida Juntos</h1>
            {isAdmin && (
              <span className="bg-romantic-100 text-romantic-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-romantic-200 ml-2">
                ADMIN
              </span>
            )}
          </motion.div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={descargarTodo}
              disabled={imagenes.length === 0 || downloadingAll}
              title="Descargar todo"
              className="p-2.5 sm:px-4 sm:py-2 bg-white border border-romantic-200 text-romantic-600 rounded-full hover:bg-romantic-50 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {downloadingAll ? (
                <Loader2 className="w-4 h-4 sm:mr-2 sm:inline animate-spin" />
              ) : (
                <Download className="w-4 h-4 sm:mr-2 sm:inline" />
              )}
              <span className="hidden sm:inline">
                {downloadingAll ? `${downloadProgress}%` : "Descargar todo"}
              </span>
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Subir Recuerdo"
              className="p-2.5 sm:px-5 sm:py-2 bg-romantic-500 text-white rounded-full hover:bg-romantic-600 shadow-lg shadow-romantic-200 transition-all active:scale-95 text-sm font-medium"
            >
              <Plus className="w-4 h-4 sm:mr-2 sm:inline" />
              <span className="hidden sm:inline">Subir Recuerdo</span>
            </button>

            <div className="w-[1px] h-6 bg-romantic-200 mx-1 hidden sm:block"></div>

            <button
              onClick={handleLogout}
              title="Cerrar Sesión"
              className="p-2.5 bg-romantic-100 text-romantic-600 rounded-full hover:bg-romantic-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 xl:px-12 pt-8">
        {/* Tabs romantic switcher */}
        <div className="flex justify-center mb-8 sm:mb-12 w-full px-2">
          <div className="bg-white/50 backdrop-blur-md p-1.5 sm:p-2 rounded-2xl sm:rounded-[30px] shadow-xl border border-white/40 flex w-full sm:w-auto overflow-hidden">
            <button
              onClick={() => setActiveTab('album')}
              className={`flex-1 sm:flex-none py-3 sm:px-8 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-sm font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
                activeTab === 'album' 
                  ? 'bg-romantic-500 text-white shadow-lg shadow-romantic-200 scale-100' 
                  : 'text-gray-400 hover:text-romantic-400 bg-transparent'
              }`}
            >
              <ImageIcon className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="leading-none text-center">NUESTRO<br className="sm:hidden"/> ÁLBUM</span>
            </button>
            <button
              onClick={() => setActiveTab('diario')}
              className={`flex-1 sm:flex-none py-3 sm:px-8 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-sm font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
                activeTab === 'diario' 
                  ? 'bg-romantic-500 text-white shadow-lg shadow-romantic-200 scale-100' 
                  : 'text-gray-400 hover:text-romantic-400 bg-transparent'
              }`}
            >
              <BookHeart className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="leading-none text-center">DIARIO<br className="sm:hidden"/> DE AMOR</span>
            </button>
            <button
              onClick={() => setActiveTab('estadisticas')}
              className={`flex-1 sm:flex-none py-3 sm:px-8 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-sm font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
                activeTab === 'estadisticas' 
                  ? 'bg-romantic-500 text-white shadow-lg shadow-romantic-200 scale-100' 
                  : 'text-gray-400 hover:text-romantic-400 bg-transparent'
              }`}
            >
              <Activity className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="leading-none text-center">VISITAS</span>
            </button>
          </div>
        </div>

        {activeTab === 'estadisticas' ? (
          <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-white/70 backdrop-blur-md p-4 sm:p-5 rounded-[28px] border border-white/50 shadow-sm">
              <div className="text-center sm:text-left">
                <h2 className="text-2xl sm:text-3xl font-black text-gray-800 flex items-center justify-center sm:justify-start gap-3">
                  Registro de Visitas <Globe2 className="w-6 h-6 text-romantic-400 animate-pulse" />
                </h2>
                <p className="text-gray-500 mt-1.5 text-xs sm:text-sm">Conoce desde dónde y qué dispositivos han estado viendo nuestro álbum.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence>
                {visitasAgrupadas.map((grupo, i) => (
                  <motion.div
                    key={grupo.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white p-5 rounded-[28px] shadow-sm border border-romantic-50 hover:shadow-xl transition-all flex flex-col justify-between cursor-pointer"
                    onClick={() => setExpandedDeviceKey(expandedDeviceKey === grupo.key ? null : grupo.key)}
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-romantic-50 flex items-center justify-center text-romantic-500">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-gray-800 font-black text-sm">{grupo.dispositivo}</p>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-romantic-50 text-romantic-600 border border-romantic-100">
                              {grupo.sesiones_count} {grupo.sesiones_count === 1 ? "sesión" : "sesiones"}
                            </span>
                            <ChevronRight className={`w-4 h-4 text-romantic-300 transition-transform ${expandedDeviceKey === grupo.key ? "rotate-90" : ""}`} />
                          </div>
                          <div className="flex items-center gap-1.5 text-romantic-400 text-[10px] font-bold mt-0.5 uppercase">
                            <MapPin className="w-3 h-3" />
                            <span>
                              {grupo.ubicaciones.length === 0
                                ? "SIN UBICACIÓN"
                                : grupo.ubicaciones.length === 1
                                  ? grupo.ubicaciones[0]
                                  : `${grupo.ubicaciones.length} UBICACIONES`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mt-4 bg-gray-50 p-3 rounded-2xl">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 font-medium flex items-center gap-1"><ClockIcon className="w-3 h-3"/> Última vez</span>
                          <span className="font-bold text-gray-700">
                            {grupo.ultima_actividad
                              ? new Date(grupo.ultima_actividad).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                              : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 font-medium flex items-center gap-1"><History className="w-3 h-3"/> Tiempo total</span>
                          <span className="font-bold text-gray-700">{formatDurationSeconds(grupo.total_segundos)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 font-medium flex items-center gap-1"><ImageIcon className="w-3 h-3"/> Fotos vistas</span>
                          <span className="font-bold text-gray-700">{grupo.fotos_vistas_count}</span>
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedDeviceKey === grupo.key && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 space-y-2">
                              {grupo.sesiones.map((sesion) => (
                                <div key={sesion.id} className="bg-white border border-romantic-100 rounded-2xl p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 text-romantic-400 text-[10px] font-black uppercase">
                                        <MapPin className="w-3 h-3" />
                                        <span className="truncate">{sesion.ubicacion || "SIN UBICACIÓN"}</span>
                                      </div>
                                      <p className="text-gray-600 text-xs font-bold mt-1">
                                        {sesion.ultima_actividad
                                          ? new Date(sesion.ultima_actividad).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                          : "-"}
                                      </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="text-gray-800 text-xs font-black">{formatDurationSeconds(sesion.duracion_segundos)}</p>
                                      <p className="text-gray-400 text-[10px] font-bold mt-1">{(sesion.fotos_vistas?.length || 0)} fotos</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {todasLasVisitas.length === 0 && (
              <div className="text-center py-20 bg-white/40 rounded-[40px] border-2 border-dashed border-romantic-100">
                <Activity className="w-16 h-16 text-romantic-200 mx-auto mb-4 opacity-50" />
                <p className="text-gray-400 font-bold">Aún no hay visitas registradas...</p>
                <p className="text-gray-300 text-sm mt-1">Asegúrate de que la tabla &apos;visitas&apos; está creada en la base de datos.</p>
              </div>
            )}
          </div>
        ) : activeTab === 'album' ? (
          <>
            {/* Stories Section - Instagram Style */}
            {imagenes.length > 0 && (
              <section className="mb-12 overflow-x-auto pb-6 no-scrollbar">
                <div className="flex gap-6 items-start">
                  <div className="flex flex-col items-center gap-2 min-w-[80px]">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-romantic-300 flex items-center justify-center bg-white shadow-sm hover:bg-romantic-50 transition-colors"
                    >
                      <Plus className="text-romantic-400 w-8 h-8" />
                    </motion.button>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Añadir</span>
                  </div>
                  
                  {historiasOrdenadas.map((img, i) => {
                    const vista = vistas.includes(img.id)
                    const nueva = esNueva(img.created_at)
                    
                    return (
                      <motion.div 
                        key={`story-${img.id}`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer group"
                        onClick={() => {
                          setSelectedStoryIndex(i)
                          marcarComoVista(img.id)
                        }}
                      >
                        <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[3px] ${
                          vista 
                            ? 'bg-gray-200' 
                            : 'bg-gradient-to-tr from-romantic-300 via-romantic-500 to-romantic-600'
                        } shadow-md transition-all duration-300 group-hover:scale-105`}>
                          <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-gray-100 flex items-center justify-center">
                            {isVideo(img.url) ? (
                              <div className="w-full h-full relative">
                                <video src={img.url} crossOrigin="anonymous" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <Play className="text-white w-6 h-6 fill-white" />
                                </div>
                              </div>
                            ) : (
                              <img src={img.url} crossOrigin="anonymous" className="w-full h-full object-cover" alt="Story" />
                            )}
                          </div>
                          
                          {nueva && !vista && (
                            <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-white animate-pulse">
                              NUEVA
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold truncate w-full text-center px-1 ${
                          vista ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {new Date(img.fecha + "T00:00:00").toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                        </span>
                      </motion.div>
                    )
                  })}
                </div>
              </section>
            )}
            {/* Welcome Section */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-12 text-center sm:text-left flex flex-col md:flex-row gap-8 xl:gap-20 items-center md:items-start"
            >
              <div className="flex-1">
                <motion.h2 
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  className="text-4xl sm:text-5xl 2xl:text-7xl font-extrabold text-gray-800 mb-4 tracking-tight"
                >
                  Nuestra historia en fotos <Sparkles className="inline text-romantic-400 w-8 h-8 2xl:w-12 2xl:h-12" />
                </motion.h2>
                <p className="text-gray-500 text-lg 2xl:text-2xl mb-8 font-medium">
                  Guardando cada lugar, cada fecha y cada sentimiento. ✨
                </p>
                
                <div className="flex flex-wrap gap-4 mb-10">
                  <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-romantic-100 flex items-center gap-3">
                    <span className="text-2xl font-black text-romantic-500">{imagenes.length}</span>
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Momentos</span>
                  </div>
                  <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-romantic-100 flex items-center gap-3">
                    <Clock className="text-romantic-300 w-5 h-5" />
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest text-romantic-500">Para siempre</span>
                  </div>
                </div>

                {/* Timers Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="bg-white p-6 rounded-[32px] shadow-sm border border-romantic-100 relative overflow-hidden group hover:shadow-md transition-shadow"
                  >
                    <div className="absolute top-0 right-0 p-4 bg-romantic-50 text-romantic-300 rounded-bl-[32px]">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-bold text-romantic-300 uppercase tracking-[0.2em] mb-4">Desde que todo empezó 💙</p>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-black text-gray-800 tracking-tighter">{timeTogether.noOficial.days}</span>
                      <span className="text-sm font-bold text-gray-400">días</span>
                    </div>
                    <div className="flex gap-4 text-xs font-bold text-romantic-400">
                      <span>{String(timeTogether.noOficial.hours).padStart(2, '0')}h</span>
                      <span>{String(timeTogether.noOficial.minutes).padStart(2, '0')}m</span>
                      <span>{String(timeTogether.noOficial.seconds).padStart(2, '0')}s</span>
                    </div>
                    <p className="mt-4 text-[10px] text-gray-400 font-medium">15 de diciembre, 2025</p>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="bg-romantic-500 p-6 rounded-[32px] shadow-lg shadow-romantic-100 relative overflow-hidden group hover:scale-[1.02] transition-transform"
                  >
                    <div className="absolute top-0 right-0 p-4 bg-white/10 text-white/50 rounded-bl-[32px]">
                      <Heart className="w-5 h-5 fill-current" />
                    </div>
                    <p className="text-[10px] font-bold text-white/80 uppercase tracking-[0.2em] mb-4">Nuestro Sí Oficial 💍</p>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-black text-white tracking-tighter">{timeTogether.oficial.days}</span>
                      <span className="text-sm font-bold text-white/70">días</span>
                    </div>
                    <div className="flex gap-4 text-xs font-bold text-white/60">
                      <span>{String(timeTogether.oficial.hours).padStart(2, '0')}h</span>
                      <span>{String(timeTogether.oficial.minutes).padStart(2, '0')}m</span>
                      <span>{String(timeTogether.oficial.seconds).padStart(2, '0')}s</span>
                    </div>
                    <p className="mt-4 text-[10px] text-white/50 font-medium">14 de febrero, 2026</p>
                  </motion.div>
                </div>
              </div>

              {/* Historias del día y Recuerdo del día */}
              <div className="flex flex-col sm:flex-row gap-8 items-center justify-center md:items-start shrink-0">
                {/* Historias del Día (Libros apilados) */}
                {historiasDelDia.length > 0 && (
                  <motion.div 
                    initial={{ rotate: -5, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    className="relative w-64 h-80 flex flex-col items-center group cursor-pointer"
                    onClick={() => {
                      setCurrentDayStoryIdx(0)
                      setShowDayStoriesModal(true)
                    }}
                  >
                    <div className="absolute inset-0 bg-white rounded-2xl shadow-xl border border-romantic-100 transform translate-y-4 translate-x-4 rotate-6 group-hover:rotate-12 transition-transform duration-500"></div>
                    <div className="absolute inset-0 bg-white rounded-2xl shadow-lg border border-romantic-100 transform translate-y-2 translate-x-2 rotate-3 group-hover:rotate-6 transition-transform duration-500"></div>
                    
                    <div className="relative w-full h-full bg-white rounded-2xl shadow-md border-4 border-white overflow-hidden flex flex-col group-hover:scale-105 transition-transform duration-500">
                      <div className="flex-1 overflow-hidden relative">
                        {isVideo(historiasDelDia[0].url) ? (
                          <video src={historiasDelDia[0].url} crossOrigin="anonymous" className="w-full h-full object-cover" />
                        ) : (
                          <img src={historiasDelDia[0].url} crossOrigin="anonymous" className="w-full h-full object-cover" alt="Recuerdos pasados" />
                        )}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                          {isVideo(historiasDelDia[0].url) && <Play className="text-white w-10 h-10 fill-white" />}
                        </div>
                        <div className="absolute top-3 left-3 bg-romantic-500 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-lg">
                          {historiasDelDia.length} recuerdos pasados
                        </div>
                      </div>
                      <div className="p-4 bg-white text-center">
                        <p className="text-romantic-600 font-black text-sm uppercase tracking-tighter">Recuerdos de un día como hoy</p>
                        <p className="text-[10px] text-gray-400 font-medium">Pulsa para abrir el álbum</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Recuerdo del día Card */}
                {recuerdoDelDia && (
                  <motion.div 
                    initial={{ rotate: 2, scale: 0.9, opacity: 0 }}
                    animate={{ rotate: -2, scale: 1, opacity: 1 }}
                    whileHover={{ rotate: 0, scale: 1.05 }}
                    onClick={() => setSelectedImage(recuerdoDelDia)}
                    className="w-64 bg-white p-3 rounded-xl shadow-xl border-4 border-white transform transition-all cursor-pointer group"
                  >
                    <div className="aspect-square overflow-hidden rounded-lg mb-2 relative flex items-center justify-center bg-gray-100">
                      {isVideo(recuerdoDelDia.url) ? (
                        <div className="w-full h-full relative">
                          <video src={recuerdoDelDia.url} crossOrigin="anonymous" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/0 transition-colors">
                            <Play className="text-white w-10 h-10 fill-white" />
                          </div>
                        </div>
                      ) : (
                        <img src={recuerdoDelDia.url} crossOrigin="anonymous" className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Recuerdo" />
                      )}
                      <div className="absolute top-2 right-2 bg-romantic-500/90 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
                        Recuerdo del día
                      </div>
                    </div>
                    <div className="px-1 text-center">
                      <p className="text-romantic-600 text-xs font-bold mb-1 flex items-center justify-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(recuerdoDelDia.fecha + "T00:00:00").toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-gray-600 text-[11px] italic line-clamp-2">&quot;{recuerdoDelDia.nota || "Te amo mucho"}&quot;</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Timeline Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="h-[1px] flex-1 bg-romantic-200"></div>
              <span className="text-romantic-400 font-bold text-sm tracking-widest uppercase">Nuestra Línea de Tiempo</span>
              <div className="h-[1px] flex-1 bg-romantic-200"></div>
            </div>

            {/* Gallery Grid */}
            <div className="timeline-weave">
              <div className="gallery-grid relative">
                <AnimatePresence>
                  {imagenes.map((img, index) => (
                    <motion.div
                      key={img.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      className={`gallery-item timeline-card timeline-branch ${
                        index % 2 === 0 ? "timeline-branch-left" : "timeline-branch-right"
                      } group hover:shadow-2xl hover:shadow-romantic-100/30 transition-all duration-500`}
                    >
                      <div
                        className="relative cursor-pointer min-h-[200px] flex items-center justify-center bg-gray-50"
                        onClick={() => setSelectedImage(img)}
                      >
                        {isVideo(img.url) ? (
                          <div className="w-full relative">
                            <video src={img.url} crossOrigin="anonymous" className="w-full h-auto object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/0 transition-all">
                              <div className="bg-white/90 p-4 rounded-full shadow-xl transform transition-transform group-hover:scale-110">
                                <Play className="text-romantic-500 w-8 h-8 fill-romantic-500" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={img.url}
                            crossOrigin="anonymous"
                            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                            alt="Recuerdo"
                            loading="lazy"
                          />
                        )}

                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full shadow-sm flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-romantic-500" />
                          <span className="text-[10px] font-bold text-gray-700">
                            {new Date(img.fecha + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                          </span>
                        </div>

                        {img.metadata?.audio && (
                          <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-md z-10">
                            <Music className="w-4 h-4 text-romantic-500 animate-pulse" />
                          </div>
                        )}

                        {isAdmin && (
                          <div className="absolute top-4 right-4 flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedImage(img)
                                setIsEditing(true)
                                setEditForm({ fecha: img.fecha, ubicacion: img.ubicacion, nota: img.nota })
                              }}
                              className="bg-white/90 hover:bg-romantic-50 text-romantic-500 p-2.5 rounded-full shadow-lg transition-all active:scale-90"
                              title="Editar Recuerdo"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-white">
                        {img.ubicacion && (
                          <div className="flex items-center gap-1.5 text-romantic-500 mb-2">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="text-xs font-semibold truncate">{img.ubicacion}</span>
                          </div>
                        )}

                        {img.nota && (
                          <div className="flex gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />
                            <p className="text-gray-500 text-xs italic leading-relaxed line-clamp-3">{img.nota}</p>
                          </div>
                        )}

                        {!img.nota && !img.ubicacion && <p className="text-gray-300 text-[10px] italic">Momento guardado con amor</p>}

                        <div className="mt-4 pt-3 border-t border-romantic-50 flex justify-between items-center">
                          <span className="text-[9px] text-gray-400 uppercase tracking-tighter">{new Date(img.fecha).getFullYear()}</span>
                          <Heart className="w-3.5 h-3.5 text-romantic-200 group-hover:text-romantic-500 group-hover:fill-romantic-500 transition-colors" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-8 w-full">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-white/70 backdrop-blur-md p-4 sm:p-5 rounded-[28px] border border-white/50 shadow-sm hover:shadow-md transition-all">
              <div className="text-center sm:text-left">
                <h2 className="text-2xl sm:text-3xl font-black text-gray-800 flex items-center justify-center sm:justify-start gap-3">
                  Diario de Nosotros <MessageCircleHeart className="w-6 h-6 text-romantic-400 animate-pulse" />
                </h2>
                <p className="text-gray-500 mt-1.5 text-xs sm:text-sm">Pequeñas notas de amor, pensamientos o momentos que queremos recordar juntos.</p>
              </div>
              <button
                onClick={() => setShowDiarioModal(true)}
                className="bg-gradient-to-r from-romantic-500 to-romantic-600 text-white px-4 py-2.5 rounded-2xl font-black text-xs shadow-lg shadow-romantic-100 hover:from-romantic-600 hover:to-romantic-700 transition-all flex items-center gap-2 group whitespace-nowrap active:scale-[0.98]"
              >
                <PenLine className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                ESCRIBIR NOTA
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {diario.map((nota, idx) => (
                  <motion.div
                    key={nota.id}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white p-5 rounded-[28px] shadow-sm border border-romantic-50 relative group hover:shadow-xl hover:shadow-romantic-100/30 transition-all cursor-pointer flex flex-col justify-between"
                    onClick={() => setSelectedNota(nota)}
                  >
                    <div>
                      <div className="absolute top-4 right-6 text-romantic-100 group-hover:text-romantic-200 transition-colors">
                        <Sparkles className="w-6 h-6 opacity-40" />
                      </div>
                      
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-full bg-romantic-100 flex items-center justify-center text-romantic-500 font-bold text-base">
                          {nota.autor[0]?.toUpperCase() || '❤'}
                        </div>
                        <div>
                          <p className="text-gray-800 font-black text-xs leading-none">{nota.autor.toUpperCase()}</p>
                          <div className="flex items-center gap-1.5 text-romantic-400 text-[9px] font-bold mt-1 uppercase tracking-wider">
                            <span>{new Date(nota.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                            <span className="opacity-30">•</span>
                            <div className="flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{new Date(nota.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-3 top-0 w-1 h-full bg-romantic-100/50 rounded-full" />
                        <p className="text-gray-600 leading-relaxed italic text-sm sm:text-base pr-2 whitespace-pre-wrap break-words max-h-[9.5rem] overflow-hidden">
                          &quot;{nota.contenido}&quot;
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <button 
                            className="w-8 h-8 rounded-full bg-romantic-50 flex items-center justify-center text-romantic-400 hover:bg-romantic-500 hover:text-white transition-all active:scale-90"
                            onClick={(e) => {
                              confetti({
                                particleCount: 20,
                                spread: 40,
                                origin: { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight },
                                colors: ['#f84a7e', '#ffb6c1']
                              })
                            }}
                          >
                            <Heart className="w-4 h-4 fill-current" />
                          </button>
                          <button 
                            className="w-8 h-8 rounded-full bg-romantic-50 flex items-center justify-center text-romantic-400 hover:bg-romantic-500 hover:text-white transition-all active:scale-90"
                            onClick={(e) => {
                              e.stopPropagation();
                              compartirNota(nota);
                            }}
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <div className="flex -space-x-1">
                            {['😍', '✨', '🫂'].map((emoji, i) => (
                              <button 
                                key={i}
                                className="w-7 h-7 rounded-full bg-white border border-gray-50 flex items-center justify-center text-sm shadow-sm hover:z-10 hover:scale-110 transition-transform active:scale-90"
                                onClick={() => {
                                   const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
                                   audio.volume = 0.2;
                                   audio.play().catch(() => {});
                                }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                       </div>
                       <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                         <div className="w-1.5 h-1.5 rounded-full bg-romantic-300 animate-bounce" />
                         <div className="w-1.5 h-1.5 rounded-full bg-romantic-300 animate-bounce [animation-delay:0.2s]" />
                         <div className="w-1.5 h-1.5 rounded-full bg-romantic-300 animate-bounce [animation-delay:0.4s]" />
                       </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {diario.length === 0 && (
              <div className="text-center py-20 bg-white/40 rounded-[40px] border-2 border-dashed border-romantic-100">
                <BookHeart className="w-16 h-16 text-romantic-200 mx-auto mb-4 opacity-50" />
                <p className="text-gray-400 font-bold">Aún no hay notas en nuestro diario...</p>
                <p className="text-gray-300 text-sm mt-1">¡Sé el primero en escribir algo bonito hoy!</p>
              </div>
            )}
          </div>
        )}
      </main>


      {/* Day Stories Modal (Presentación) */}
      <AnimatePresence>
        {showDayStoriesModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 sm:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setShowDayStoriesModal(false)}
            />

            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-4xl h-full max-h-[80vh] flex flex-col items-center justify-center z-10"
            >
              {currentDayStoryIdx < historiasDelDia.length ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <div className="absolute top-0 left-0 right-0 flex gap-2 p-4 z-20">
                    {historiasDelDia.map((_, idx) => (
                      <div key={`day-bar-${idx}`} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ 
                            width: idx === currentDayStoryIdx ? "100%" : idx < currentDayStoryIdx ? "100%" : "0%" 
                          }}
                          transition={{ duration: idx === currentDayStoryIdx ? 4 : 0, ease: "linear" }}
                          onAnimationComplete={() => {
                            if (idx === currentDayStoryIdx) {
                              setCurrentDayStoryIdx(prev => prev + 1)
                            }
                          }}
                          className="h-full bg-romantic-400"
                        />
                      </div>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={historiasDelDia[currentDayStoryIdx].id}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      className="w-full h-full flex flex-col items-center justify-center"
                    >
                      <div className="relative max-h-[70%] w-full flex justify-center">
                        {isVideo(historiasDelDia[currentDayStoryIdx].url) ? (
                          <VideoPlayer 
                            src={historiasDelDia[currentDayStoryIdx].url} 
                            className="max-h-full max-w-full rounded-2xl shadow-2xl border-4 border-white/10 aspect-video" 
                          />
                        ) : (
                          <img 
                            src={historiasDelDia[currentDayStoryIdx].url} 
                            className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl border-4 border-white/10" 
                            alt="Story" 
                          />
                        )}
                      </div>
                      <div className="mt-8 text-center text-white px-6">
                        <p className="text-romantic-300 font-black text-xl mb-2">
                          {new Date(historiasDelDia[currentDayStoryIdx].fecha + "T00:00:00").getFullYear()}
                        </p>
                        <p className="text-lg italic font-medium max-w-2xl">
                          &quot;{historiasDelDia[currentDayStoryIdx].nota || "Un momento inolvidable"}&quot;
                        </p>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              ) : (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white rounded-[40px] p-10 flex flex-col items-center text-center max-w-md shadow-2xl"
                >
                  <div className="w-24 h-24 bg-romantic-100 rounded-full flex items-center justify-center mb-6">
                    <Sparkles className="text-romantic-500 w-12 h-12" />
                  </div>
                  <h3 className="text-3xl font-black text-gray-800 mb-4">¡Qué lindo es recordar!</h3>
                  <p className="text-gray-500 mb-8 font-medium">Hemos revivido {historiasDelDia.length} momentos de este día en años anteriores. ❤️</p>
                  
                  {/* Collage Preview (Simple representation) */}
                  <div className="grid grid-cols-3 gap-2 mb-8 w-full aspect-video overflow-hidden rounded-2xl border-2 border-romantic-50 p-2">
                    {historiasDelDia.slice(0, 6).map((img, i) => (
                      <div key={`mini-${i}`} className="w-full h-full bg-gray-100 rounded-lg overflow-hidden">
                        <img src={img.url} className="w-full h-full object-cover" alt="mini" />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col w-full gap-3">
                    <button 
                      onClick={descargarCollage}
                      className="w-full bg-romantic-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-romantic-200 hover:bg-romantic-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      <span>Descargar este collage</span>
                    </button>
                    <button 
                      onClick={() => setShowDayStoriesModal(false)}
                      className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                    >
                      Cerrar álbum del día
                    </button>
                  </div>
                </motion.div>
              )}

              <button 
                onClick={() => setShowDayStoriesModal(false)}
                className="absolute -top-12 right-0 sm:-right-12 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Modal — masivo por foto */}
      <AnimatePresence>
        {showUploadModal && selectedFiles.length > 0 && (
          <BulkUploadModal
            files={selectedFiles}
            initialTrim={trimData}
            uploading={uploading}
            uploadProgress={uploadProgress}
            uploadStatus={uploadStatus}
            onClose={() => {
              if (uploading) return
              setShowUploadModal(false)
              setSelectedFiles([])
              setTrimData(null)
            }}
            onUpload={subirImagenes}
          />
        )}
      </AnimatePresence>

      {/* Fullscreen Story Viewer (Instagram Style) */}
      <AnimatePresence>
        {selectedStoryIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black sm:bg-black/90 sm:p-6"
          >
            <motion.div 
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.7}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100) setSelectedStoryIndex(null)
              }}
              initial={{ scale: 0.9, y: 100, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 100, opacity: 0 }}
              className="relative w-full h-full max-w-lg bg-black overflow-hidden sm:rounded-3xl shadow-2xl"
            >
              {/* Progress Bars */}
              <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-50">
                {historiasOrdenadas.map((_, idx) => (
                  <div key={`bar-${idx}`} className="h-[2px] flex-1 bg-white/20 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ 
                        width: idx === selectedStoryIndex ? "100%" : idx < selectedStoryIndex ? "100%" : "0%" 
                      }}
                      transition={{ 
                        duration: idx === selectedStoryIndex ? 5 : 0, 
                        ease: "linear" 
                      }}
                      onAnimationComplete={() => {
                        if (idx === selectedStoryIndex) {
                          if (selectedStoryIndex < historiasOrdenadas.length - 1) {
                            setSelectedStoryIndex(selectedStoryIndex + 1)
                          } else {
                            setSelectedStoryIndex(null)
                          }
                        }
                      }}
                      className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                    />
                  </div>
                ))}
              </div>

              {/* Story Header */}
              <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full border-2 border-romantic-400 p-[2px] bg-white/10 overflow-hidden">
                    <img src={historiasOrdenadas[selectedStoryIndex].url} className="w-full h-full object-cover rounded-full" alt="Avatar" />
                  </div>
                  <div className="drop-shadow-md">
                    <p className="text-sm font-bold text-white">Nuestra Historia</p>
                    <p className="text-[10px] text-white/70 font-medium">
                      {new Date(historiasOrdenadas[selectedStoryIndex].fecha + "T00:00:00").toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedStoryIndex(null)}
                  className="p-2 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md transition-colors text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Navigation Areas */}
              <div className="absolute inset-0 z-40 flex">
                <div 
                  className="flex-1 cursor-pointer" 
                  onClick={() => {
                    if (selectedStoryIndex > 0) setSelectedStoryIndex(selectedStoryIndex - 1)
                  }}
                />
                <div 
                  className="flex-1 cursor-pointer" 
                  onClick={() => {
                    if (selectedStoryIndex < historiasOrdenadas.length - 1) {
                      setSelectedStoryIndex(selectedStoryIndex + 1)
                    } else {
                      setSelectedStoryIndex(null)
                    }
                  }}
                />
              </div>

               {/* Main Media Container */}
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <AnimatePresence mode="wait">
                  {isVideo(historiasOrdenadas[selectedStoryIndex].url) ? (
                    <VideoPlayer 
                      src={historiasOrdenadas[selectedStoryIndex].url} 
                      className="max-h-full w-full object-contain"
                      autoPlay
                      muted
                      playsInline
                      trim={historiasOrdenadas[selectedStoryIndex].metadata?.trim}
                      onEnded={() => {
                        if (selectedStoryIndex < historiasOrdenadas.length - 1) {
                          setSelectedStoryIndex(selectedStoryIndex + 1)
                        } else {
                          setSelectedStoryIndex(null)
                        }
                      }}
                    />
                  ) : (
                    <motion.img 
                      key={historiasOrdenadas[selectedStoryIndex].id}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      src={historiasOrdenadas[selectedStoryIndex].url} 
                      className="max-h-full w-full object-contain" 
                      alt="Full Story" 
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Footer Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-8 pb-14 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white z-50 pointer-events-none">
                {historiasOrdenadas[selectedStoryIndex].ubicacion && (
                  <motion.div 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex justify-center mb-3"
                  >
                    <div className="flex items-center gap-1.5 text-romantic-300 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/5 text-[10px] font-bold uppercase tracking-widest shadow-lg">
                      <MapPin className="w-3 h-3" />
                      <span>{historiasOrdenadas[selectedStoryIndex].ubicacion}</span>
                    </div>
                  </motion.div>
                )}
                {historiasOrdenadas[selectedStoryIndex].nota && (
                  <motion.p 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-center text-base sm:text-lg italic font-medium leading-tight font-serif drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] px-4"
                  >
                    &quot;{historiasOrdenadas[selectedStoryIndex].nota}&quot;
                  </motion.p>
                )}
                <div className="mt-6 flex justify-center">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      filter: ["drop-shadow(0 0 0px #f84a7e)", "drop-shadow(0 0 10px #f84a7e)", "drop-shadow(0 0 0px #f84a7e)"]
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Heart className="w-8 h-8 text-romantic-500 fill-romantic-500 opacity-80" />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Detail Viewer */}
      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImage(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />

            {/* Botones de Navegación - Ocultos en móvil por petición del usuario */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 hidden sm:flex justify-between px-4 sm:px-12 pointer-events-none z-[100]">
              {imagenes.findIndex(img => img.id === selectedImage.id) > 0 ? (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const idx = imagenes.findIndex(img => img.id === selectedImage.id);
                    setSelectedImage(imagenes[idx - 1]);
                    setIsEditing(false);
                  }}
                  className="p-3 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-all active:scale-95 pointer-events-auto group"
                >
                  <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
                </button>
              ) : <div />}

              {imagenes.findIndex(img => img.id === selectedImage.id) < imagenes.length - 1 ? (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const idx = imagenes.findIndex(img => img.id === selectedImage.id);
                    setSelectedImage(imagenes[idx + 1]);
                    setIsEditing(false);
                  }}
                  className="p-3 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-all active:scale-95 pointer-events-auto group"
                >
                  <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : <div />}
            </div>
            
            <motion.div 
              key={selectedImage.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-lg lg:max-w-6xl w-full max-h-[95vh] lg:h-[85vh] bg-white rounded-[2rem] overflow-hidden shadow-2xl flex flex-col transition-all duration-300"
            >
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 z-[80] bg-black/40 hover:bg-black/60 text-white p-2.5 rounded-full backdrop-blur-md transition-all shadow-lg active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex-1 overflow-y-auto pt-0 scrollbar-hide lg:flex lg:flex-row lg:overflow-hidden">
                {/* Main Media - Side by side on desktop */}
                <div className="w-full lg:w-[55%] bg-black flex items-center justify-center min-h-[240px] lg:min-h-0 lg:h-full overflow-hidden">
                  {isVideo(selectedImage.url) ? (
                    <VideoPlayer 
                      src={selectedImage.url} 
                      className="w-full h-auto lg:h-full lg:w-full block" 
                      trim={selectedImage.metadata?.trim}
                    />
                  ) : (
                    <img src={selectedImage.url} className="w-full h-auto lg:h-full lg:w-full lg:object-contain block" alt="Recuerdo" />
                  )}
                </div>

                {/* Info Section */}
                <div className="p-5 sm:p-8 lg:p-12 flex flex-col border-t lg:border-t-0 lg:border-l border-romantic-50 bg-white lg:w-[45%] lg:overflow-y-auto scrollbar-hide">
                  {!isEditing ? (
                    <>
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="flex items-center gap-2 text-romantic-500">
                          <div className="bg-romantic-50 p-1.5 rounded-lg">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-romantic-300">Fecha</p>
                            <p className="text-xs font-bold text-gray-800">
                              {new Date(selectedImage.fecha + "T00:00:00").toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        {selectedImage.ubicacion && (
                          <div className="flex items-center gap-2 text-romantic-500">
                            <div className="bg-romantic-50 p-1.5 rounded-lg">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-widest text-romantic-300">Lugar</p>
                              <p className="text-xs font-bold text-gray-800 truncate max-w-[100px] sm:max-w-none">{selectedImage.ubicacion}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mb-6">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-romantic-300 mb-2 ml-1">Nota de Amor</p>
                        <div className="bg-romantic-50/50 p-4 rounded-xl border border-romantic-100 italic relative">
                          <MessageSquare className="absolute -top-1.5 -left-1.5 w-4 h-4 text-romantic-200" />
                          <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                            &quot;{selectedImage.nota || "Un momento que guardaré en mi corazón para siempre."}&quot;
                          </p>
                        </div>
                      </div>

                      {selectedImage.metadata?.audio && (
                        <div className="mb-6 flex items-center gap-2">
                          <div className="bg-romantic-100/50 p-2 rounded-lg">
                            <Music className="w-4 h-4 text-romantic-500" />
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-romantic-300">Nuestra Música</p>
                            <p className="text-xs font-bold text-gray-700 italic">
                              🎵 {selectedImage.metadata.audio.name || "Nuestra canción especial"}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* --- PHOTO SESSION TRACKING --- */}
                      <div className="mt-8 border-t border-romantic-50 pt-6">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-romantic-300 flex items-center gap-2 mb-4">
                          <Activity className="w-3 h-3" /> Visto por
                        </p>
                        {visitasFoto.length > 0 ? (
                          <div className="space-y-3">
                            {visitasFoto.map((v, i) => (
                              <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <div className="bg-white p-2 rounded-full shadow-sm text-romantic-400">
                                  <Smartphone className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs font-bold text-gray-700">{v.dispositivo}</p>
                                  <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-2.5 h-2.5" /> {v.ubicacion}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5 flex justify-end gap-1"><ClockIcon className="w-2.5 h-2.5"/>Última Vez</p>
                                  <p className="text-[10px] font-bold text-gray-600">
                                    {new Date(v.ultima_actividad).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-400 italic">No hay visitas registradas para esta foto aún.</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-6 mb-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase text-romantic-400 ml-1">Fecha del Recuerdo</label>
                          <input 
                            type="date"
                            value={editForm.fecha}
                            onChange={(e) => setEditForm({...editForm, fecha: e.target.value})}
                            className="w-full bg-romantic-50/50 border border-romantic-100 rounded-xl p-3 text-sm focus:outline-none focus:border-romantic-300"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase text-romantic-400 ml-1">¿Dónde fue?</label>
                          <input 
                            type="text"
                            value={editForm.ubicacion}
                            placeholder="Ej: Nuestra primera cita"
                            onChange={(e) => setEditForm({...editForm, ubicacion: e.target.value})}
                            className="w-full bg-romantic-50/50 border border-romantic-100 rounded-xl p-3 text-sm focus:outline-none focus:border-romantic-300"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-romantic-400 ml-1">Nota de amor (Corrige los errores aquí ❤️)</label>
                        <textarea 
                          rows="4"
                          value={editForm.nota}
                          onChange={(e) => setEditForm({...editForm, nota: e.target.value})}
                          className="w-full bg-romantic-50/50 border border-romantic-100 rounded-2xl p-4 text-sm focus:outline-none focus:border-romantic-300 resize-none italic"
                        />
                      </div>

                      <div className="pt-2 p-4 bg-romantic-50/50 rounded-2xl border border-dashed border-romantic-200">
                        <p className="text-[10px] font-bold uppercase text-romantic-400 mb-3 ml-1">Música de Fondo</p>
                        <button
                          type="button"
                          onClick={() => setShowMusicModal(true)}
                          className={`w-full py-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all ${
                            (selectedAudioFile || youtubeEditAudio || selectedImage.metadata?.audio)
                               ? 'border-romantic-300 bg-white text-romantic-600 shadow-sm' 
                               : 'border-gray-200 text-gray-400 hover:border-romantic-200 hover:text-romantic-500 bg-white'
                          }`}
                        >
                          <Music className="w-5 h-5" />
                          <span className="text-sm font-bold uppercase tracking-tight">
                            {selectedImage.metadata?.audio || selectedAudioFile || youtubeEditAudio
                              ? "Cambiar Música"
                              : "Añadir Música"}
                          </span>
                        </button>
                        {(selectedAudioFile || youtubeEditAudio || selectedImage.metadata?.audio) && (
                          <div className="flex items-center justify-center gap-2 mt-3 text-romantic-500">
                             <Music className="w-3 h-3 animate-bounce" />
                             <p className="text-[10px] font-bold italic truncate max-w-[240px]">
                              {youtubeEditAudio?.name ||
                                selectedAudioFile?.name ||
                                selectedImage.metadata?.audio?.name ||
                                "Música actual guardada"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-4">
                    {isAdmin && (
                      <div className="grid grid-cols-2 gap-3 w-full">
                        {!isEditing ? (
                          <>
                            <button
                              onClick={() => setIsEditing(true)}
                              className="py-3 rounded-xl bg-romantic-50 text-romantic-500 text-xs font-bold hover:bg-romantic-100 transition-all flex items-center justify-center gap-2 w-full col-span-2 shadow-sm"
                            >
                              <Pencil className="w-4 h-4" />
                              Editar Texto / Música
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col gap-2 w-full col-span-2">
                            <button
                              onClick={actualizarImagen}
                              disabled={updating}
                              className="py-4 rounded-2xl bg-romantic-500 text-white text-xs font-bold hover:bg-romantic-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-romantic-100"
                            >
                              {updating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              Guardar cambios
                            </button>
                            
                            <button
                              onClick={() => eliminarImagen(selectedImage.id, selectedImage.url)}
                              disabled={deletingId === selectedImage.id}
                              className="py-3 rounded-2xl bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2 border border-red-100"
                            >
                              {deletingId === selectedImage.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                              Eliminar Recuerdo Permanemente
                            </button>

                            <button
                              onClick={() => setIsEditing(false)}
                              disabled={updating}
                              className="py-3 rounded-2xl bg-gray-100 text-gray-400 text-[10px] font-bold hover:bg-gray-200 transition-all"
                            >
                              Cancelar edición
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {!isEditing && (
                      <>
                        <div className="flex items-center gap-3 my-2">
                          <Heart className="w-8 h-8 text-romantic-500 fill-romantic-500 animate-pulse" />
                          <span className="text-romantic-600 font-bold text-lg tracking-tight">Para siempre</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 w-full">
                          <button
                            onClick={compartirRecuerdo}
                            className="py-3 rounded-xl bg-romantic-50 text-romantic-600 text-[9px] font-black hover:bg-romantic-100 transition-all flex flex-col items-center justify-center gap-1 border border-romantic-100 shadow-sm leading-tight text-center px-1"
                          >
                            <div className="flex items-center gap-1.5">
                              <Share2 className="w-3.5 h-3.5" />
                              <span>VÍDEO PARA REDES</span>
                            </div>
                            <span className="text-[7px] opacity-60">CON MÚSICA Y TEXTO</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = selectedImage.url;
                              const ext = isVideo(selectedImage.url) ? 'mp4' : 'jpg';
                              link.download = `recuerdo-${selectedImage.fecha}.${ext}`;
                              link.click();
                            }}
                            className="py-3 rounded-xl bg-gray-50 text-gray-500 text-xs font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2 border border-gray-100"
                          >
                            <Download className="w-4 h-4" />
                            <span>Descargar</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        multiple
        accept="image/*,video/*"
        onChange={handleFileChange} 
        ref={fileInputRef}
        className="hidden" 
      />

      <AnimatePresence>
        {showMusicModal && (
          <MusicPicker
            onConfirm={(payload) => {
              if (payload.source === "youtube") {
                setYoutubeEditAudio(payload)
                setSelectedAudioFile(null)
                setAudioTrimData(null)
              } else {
                setSelectedAudioFile(payload.file)
                setAudioTrimData({ startTime: payload.startTime || 0 })
                setYoutubeEditAudio(null)
              }
              setShowMusicModal(false)
            }}
            onCancel={() => setShowMusicModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {downloadingAll && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[28px] p-8 max-w-sm w-full shadow-2xl text-center space-y-4"
            >
              <Loader2 className="w-10 h-10 animate-spin text-romantic-500 mx-auto" />
              <div>
                <p className="font-black text-gray-800">Descarga masiva</p>
                <p className="text-xs text-gray-500 mt-1">{downloadStatus}</p>
              </div>
              <div className="w-full h-2 bg-romantic-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-romantic-500"
                  animate={{ width: `${downloadProgress}%` }}
                />
              </div>
              <p className="text-sm font-bold text-romantic-500">{downloadProgress}%</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {trimmingFile && (
          <VideoTrimmer 
            file={trimmingFile}
            onConfirm={handleConfirmTrim}
            onCancel={() => {
              setSelectedFiles([trimmingFile])
              setTrimmingFile(null)
              setShowUploadModal(true)
            }}
          />
        )}
      </AnimatePresence>

      <footer className="mt-12 py-8 text-center text-gray-400 text-sm">
        <div className="flex items-center justify-center gap-1 mb-2">
          Hecho con <Heart className="w-3 h-3 text-romantic-400 fill-romantic-400" /> para nosotros
        </div>
        <p>© 2026 Nuestra Vida Juntos • {imagenes.length} recuerdos guardados</p>
      </footer>

      {/* Video Generation Progress Overlay */}
      <AnimatePresence>
        {isGeneratingVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6"
          >
              <div className="bg-white rounded-[40px] p-10 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
                {!generatedVideoBlob ? (
                  <>
                    <div className="absolute top-0 left-0 w-full h-2 bg-romantic-100 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${videoProgress}%` }}
                        className="h-full bg-romantic-500"
                      />
                    </div>
                    
                    <div className="bg-romantic-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner relative overflow-hidden">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <Sparkles className="text-romantic-500 w-12 h-12" />
                      </motion.div>
                    </div>
                    
                    <h3 className="text-2xl font-black text-gray-800 mb-2 leading-tight">
                      {sharingType === 'video' ? 'Creando tu Video...' : 'Preparando tu Imagen...'}
                    </h3>
                    <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                      {sharingType === 'video' 
                        ? 'Estamos fusionando tu foto con la música para crear algo mágico. 🥺✨' 
                        : 'Estamos dando los últimos retoques a tu nota de amor. ✨'}
                    </p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black text-romantic-400 uppercase tracking-widest px-1">
                        <span>Procesando</span>
                        <span>{videoProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                         <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${videoProgress}%` }}
                          className="h-full bg-romantic-500 rounded-full"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <CheckCircle2 className="text-green-500 w-10 h-10" />
                    </div>
                    
                    <h3 className="text-2xl font-black text-gray-800 mb-2 leading-tight">¡Video Listo!</h3>
                    <p className="text-gray-500 text-sm mb-8">Ya tenemos tu video preparado con vuestro momento especial ❤️</p>
                    
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={handleShareVideo}
                        className="w-full bg-romantic-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-romantic-200 hover:bg-romantic-600 transition-all flex items-center justify-center gap-2"
                      >
                        <Share2 className="w-5 h-5" />
                        <span>Compartir ahora</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          const fechaObj = new Date(selectedImage.fecha + "T00:00:00");
                          saveAs(generatedVideoBlob, `nuestro-recuerdo-${fechaObj.getDate()}.webm`);
                        }}
                        className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                      >
                        <Download className="w-5 h-5" />
                        <span>Solo descargar</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsGeneratingVideo(false);
                          setGeneratedVideoBlob(null);
                          setVideoProgress(0);
                        }}
                        className="text-gray-400 text-xs font-bold mt-4 hover:text-gray-600"
                      >
                        Cerrar
                      </button>
                    </div>
                  </motion.div>
                )}
                
                {!generatedVideoBlob && (
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-8">Por favor, no salgas de la app</p>
                )}
              </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDiarioModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !enviandoNota && setShowDiarioModal(false)}
              className="absolute inset-0 bg-romantic-900/40 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="bg-gradient-to-r from-romantic-500 to-romantic-600 px-8 py-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookHeart className="w-6 h-6" />
                  <h3 className="text-xl font-black tracking-tight">Nueva Nota de Amor</h3>
                </div>
                {!enviandoNota && (
                  <button 
                    onClick={() => setShowDiarioModal(false)}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <form onSubmit={enviarNota} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-romantic-400 uppercase tracking-widest ml-1">¿Quién escribe? ❤️</label>
                  <input 
                    type="text"
                    required
                    placeholder="Tu nombre..."
                    value={notaData.autor}
                    onChange={(e) => setNotaData({...notaData, autor: e.target.value})}
                    className="w-full bg-romantic-50/50 border-2 border-transparent focus:border-romantic-200 rounded-2xl p-4 text-gray-700 font-bold focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-romantic-400 uppercase tracking-widest ml-1">Tu nota de hoy ✨</label>
                  <textarea 
                    required
                    rows="5"
                    placeholder="Escribe algo que te haya hecho sonreír hoy..."
                    value={notaData.contenido}
                    onChange={(e) => setNotaData({...notaData, contenido: e.target.value})}
                    className="w-full bg-romantic-50/50 border-2 border-transparent focus:border-romantic-200 rounded-2xl p-5 text-gray-700 font-serif text-lg leading-relaxed focus:outline-none transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={enviandoNota}
                  className="w-full bg-romantic-500 text-white py-5 rounded-[25px] font-black text-sm shadow-xl shadow-romantic-100 hover:bg-romantic-600 transition-all active:scale-[0.97] disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {enviandoNota ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>GUARDANDO EN EL DIARIO...</span>
                    </>
                  ) : (
                    <>
                      <PenLine className="w-5 h-5" />
                      <span>GUARDAR NOTA PARA SIEMPRE</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Selected Note Viewer Modal */}
      <AnimatePresence>
        {selectedNota && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNota(null)}
              className="absolute inset-0 bg-romantic-900/40 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[30px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="bg-gradient-to-r from-romantic-500 to-romantic-600 px-6 py-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-lg">
                    {selectedNota.autor[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-md font-black tracking-tight">{selectedNota.autor.toUpperCase()}</h3>
                    <p className="text-romantic-100 text-[10px] font-bold uppercase tracking-widest">
                       {new Date(selectedNota.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedNota(null)}
                  className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 sm:p-8 lg:p-10 overflow-y-auto custom-scrollbar">
                <div className="relative">
                  <Sparkles className="absolute -top-6 -left-6 w-12 h-12 text-romantic-100/50" />
                  <p className="text-gray-700 font-serif text-lg sm:text-xl leading-relaxed italic pr-6 whitespace-pre-wrap">
                    &quot;{selectedNota.contenido}&quot;
                  </p>
                </div>

                <div className="mt-12 pt-8 border-t border-romantic-50 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                     <div className="flex -space-x-2">
                        {['😍', '✨', '🫂', '❤'].map((emoji, i) => (
                          <div key={i} className="w-10 h-10 rounded-full bg-white border-2 border-romantic-50 flex items-center justify-center text-xl shadow-sm">
                            {emoji}
                          </div>
                        ))}
                     </div>
                     <p className="text-gray-400 text-sm font-medium italic">Guardado para siempre...</p>
                  </div>

                  <button 
                    onClick={() => compartirNota(selectedNota)}
                    className="bg-romantic-500 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-romantic-100 hover:bg-romantic-600 transition-all flex items-center gap-2 group"
                  >
                    <Share2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    <span>COMPARTIR MOMENTO</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
