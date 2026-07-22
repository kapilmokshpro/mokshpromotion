"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    ArrowLeft,
    CheckCheck,
    Hash,
    Loader2,
    MessageSquare,
    Mic,
    MicOff,
    MoreVertical,
    Pause,
    Play,
    Plus,
    Search,
    Send,
    Square,
    Trash2,
    User as UserIcon,
    Users,
    X,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────
type UserInfo = { id: number; name: string; email: string; role: string; employeeId?: string; department?: string }

type Channel = {
    id: string
    name: string
    description: string | null
    isDefault: boolean
    isDirect: boolean
    memberCount: number
    unreadCount: number
    targetUser?: UserInfo | null
}

type Message = {
    id: string
    channelId: string
    senderId: number
    sender: UserInfo
    type: "TEXT" | "VOICE"
    content: string | null
    mediaUrl: string | null
    mediaDuration: number | null
    isSystem: boolean
    createdAt: string
}

type Props = {
    currentUser: { id: number; name: string; email: string; role: string }
}

// ─── Helpers ────────────────────────────────────────────
const initial = (name: string) => (name || "?")[0].toUpperCase()

const formatTime = (iso: string) =>
    new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    }).format(new Date(iso))

const formatDate = (iso: string) =>
    new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(iso))

const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
}

const isSameDay = (a: string, b: string) => formatDate(a) === formatDate(b)

const isAdmin = (role: string) => ["ADMIN", "SUPER_ADMIN"].includes(role)

// ─── Premium Voice Player ───────────────────────────────
function VoicePlayer({
    url,
    duration,
    isOwn,
}: {
    url: string
    duration: number | null
    isOwn: boolean
}) {
    const audioRef = useRef<HTMLAudioElement>(null)
    const [playing, setPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [totalDuration, setTotalDuration] = useState(duration || 0)
    const [speed, setSpeed] = useState(1)

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const onTime = () => {
            setCurrentTime(Math.floor(audio.currentTime))
            setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0)
        }
        const onLoaded = () => {
            if (audio.duration && isFinite(audio.duration)) {
                setTotalDuration(Math.floor(audio.duration))
            }
        }
        const onEnded = () => {
            setPlaying(false)
            setProgress(0)
            setCurrentTime(0)
        }

        audio.addEventListener("timeupdate", onTime)
        audio.addEventListener("loadedmetadata", onLoaded)
        audio.addEventListener("ended", onEnded)

        return () => {
            audio.removeEventListener("timeupdate", onTime)
            audio.removeEventListener("loadedmetadata", onLoaded)
            audio.removeEventListener("ended", onEnded)
        }
    }, [])

    const toggle = () => {
        const audio = audioRef.current
        if (!audio) return
        if (playing) {
            audio.pause()
        } else {
            audio.play()
        }
        setPlaying(!playing)
    }

    const cycleSpeed = () => {
        const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1
        setSpeed(next)
        if (audioRef.current) audioRef.current.playbackRate = next
    }

    const seek = (e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current
        if (!audio || !audio.duration) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const pct = x / rect.width
        audio.currentTime = pct * audio.duration
    }

    return (
        <div className="flex items-center gap-3 py-1 min-w-[210px] max-w-[320px]">
            <audio ref={audioRef} src={url} preload="metadata" />
            
            {/* Play/Pause Button */}
            <button
                onClick={toggle}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-md transition-all hover:scale-105 active:scale-95 ${
                    isOwn
                        ? "bg-white text-[#002147]"
                        : "bg-[#002147] text-white"
                }`}
            >
                {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
            </button>

            {/* Waveform Progress */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[3px] h-8 cursor-pointer" onClick={seek}>
                    {Array.from({ length: 26 }).map((_, i) => {
                        const barPct = (i / 26) * 100
                        const isActive = barPct <= progress
                        const h = [14, 22, 28, 18, 32, 24, 16, 28, 24, 14, 26, 20, 32, 18, 26, 14, 28, 22, 16, 30, 20, 26, 14, 22, 28, 18][i] || 16
                        return (
                            <div
                                key={i}
                                className="rounded-full transition-colors duration-150"
                                style={{
                                    width: 3,
                                    height: h,
                                    backgroundColor: isActive
                                        ? isOwn
                                            ? "#ffffff"
                                            : "#002147"
                                        : isOwn
                                            ? "rgba(255,255,255,0.35)"
                                            : "#cbd5e1",
                                }}
                            />
                        )
                    })}
                </div>
                <div className="flex items-center justify-between text-[10px] font-medium tabular-nums mt-0.5">
                    <span className={isOwn ? "text-blue-100" : "text-slate-500"}>
                        {formatDuration(currentTime)}
                    </span>
                    <span className={isOwn ? "text-blue-100" : "text-slate-500"}>
                        {formatDuration(totalDuration)}
                    </span>
                </div>
            </div>

            {/* Speed Toggle */}
            <button
                onClick={cycleSpeed}
                className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold transition-colors ${
                    isOwn
                        ? "bg-white/20 text-white hover:bg-white/30"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
            >
                {speed}x
            </button>
        </div>
    )
}

// ─── Voice Recorder Bar ─────────────────────────────────
function VoiceRecorder({ onSend, onCancel }: { onSend: (blob: Blob, duration: number) => void; onCancel: () => void }) {
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const [recording, setRecording] = useState(true)
    const [elapsed, setElapsed] = useState(0)
    const [preview, setPreview] = useState<{ blob: Blob; url: string; duration: number } | null>(null)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const startTimeRef = useRef<number>(Date.now())

    useEffect(() => {
        let stream: MediaStream | null = null

        const startRecording = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                        ? "audio/webm;codecs=opus"
                        : "audio/webm",
                })
                mediaRecorderRef.current = mediaRecorder
                chunksRef.current = []
                startTimeRef.current = Date.now()

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunksRef.current.push(e.data)
                }

                mediaRecorder.onstop = () => {
                    const dur = Math.floor((Date.now() - startTimeRef.current) / 1000)
                    const blob = new Blob(chunksRef.current, { type: "audio/webm" })
                    const url = URL.createObjectURL(blob)
                    setPreview({ blob, url, duration: dur })
                    setRecording(false)
                    stream?.getTracks().forEach((t) => t.stop())
                }

                mediaRecorder.start()
                setRecording(true)

                intervalRef.current = setInterval(() => {
                    const sec = Math.floor((Date.now() - startTimeRef.current) / 1000)
                    setElapsed(sec)
                    if (sec >= 120) {
                        mediaRecorder.stop()
                        if (intervalRef.current) clearInterval(intervalRef.current)
                    }
                }, 200)
            } catch {
                onCancel()
            }
        }

        startRecording()

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
            if (mediaRecorderRef.current?.state === "recording") {
                mediaRecorderRef.current.stop()
            }
            stream?.getTracks().forEach((t) => t.stop())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const stopRecording = () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop()
        }
    }

    const handleSend = () => {
        if (preview) {
            onSend(preview.blob, preview.duration)
            URL.revokeObjectURL(preview.url)
        }
    }

    const handleCancel = () => {
        if (preview) URL.revokeObjectURL(preview.url)
        if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop()
        }
        if (intervalRef.current) clearInterval(intervalRef.current)
        onCancel()
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-3 w-full"
        >
            {recording ? (
                <>
                    <button onClick={handleCancel} className="p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors" title="Discard voice note">
                        <Trash2 className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-2 flex-1 bg-red-50 border border-red-100 rounded-full px-4 py-2">
                        <motion.div
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ repeat: Infinity, duration: 1.2 }}
                            className="h-3 w-3 rounded-full bg-red-500 shrink-0"
                        />
                        <span className="text-sm font-semibold text-red-600 tabular-nums">{formatDuration(elapsed)}</span>
                        <span className="text-xs text-red-500 font-medium">Recording voice note...</span>
                    </div>
                    <button
                        onClick={stopRecording}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 transition-colors"
                        title="Stop recording"
                    >
                        <Square className="h-4 w-4" fill="white" />
                    </button>
                </>
            ) : preview ? (
                <>
                    <button onClick={handleCancel} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 transition-colors" title="Discard">
                        <Trash2 className="h-5 w-5" />
                    </button>
                    <div className="flex-1 flex items-center gap-3 rounded-2xl bg-slate-100 px-4 py-2">
                        <audio src={preview.url} controls className="h-8 flex-1" style={{ maxHeight: 32 }} />
                        <span className="text-xs font-semibold text-slate-600 tabular-nums shrink-0">{formatDuration(preview.duration)}</span>
                    </div>
                    <button
                        onClick={handleSend}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#002147] text-white shadow-md hover:bg-[#003366] transition-colors"
                        title="Send Voice Note"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </>
            ) : null}
        </motion.div>
    )
}

// ─── Create Group Channel Modal ─────────────────────────
function CreateChannelModal({
    onClose,
    onCreated,
}: {
    onClose: () => void
    onCreated: (ch: Channel) => void
}) {
    const [name, setName] = useState("")
    const [desc, setDesc] = useState("")
    const [creating, setCreating] = useState(false)

    const handleCreate = async () => {
        if (!name.trim() || name.trim().length < 2) return
        setCreating(true)
        try {
            const res = await fetch("/api/chat/channels", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), description: desc.trim() || undefined }),
            })
            if (!res.ok) throw new Error("Failed")
            const ch = await res.json()
            onCreated({ ...ch, unreadCount: 0 })
            onClose()
        } finally {
            setCreating(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Create Group Channel</h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Channel Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Operations Team"
                            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#002147]/30 focus:border-[#002147]"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
                        <input
                            type="text"
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="What is this channel about?"
                            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#002147]/30 focus:border-[#002147]"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={creating || name.trim().length < 2}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#002147] rounded-lg hover:bg-[#003366] disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                        {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Create Channel
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

// ─── Start 1-on-1 DM Modal ──────────────────────────────
function NewDmModal({
    onClose,
    onSelectUser,
}: {
    onClose: () => void
    onSelectUser: (user: UserInfo) => void
}) {
    const [users, setUsers] = useState<UserInfo[]>([])
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(true)
    const [selectingId, setSelectingId] = useState<number | null>(null)

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch("/api/chat/users")
                if (res.ok) {
                    const data = await res.json()
                    setUsers(data)
                }
            } finally {
                setLoading(false)
            }
        }
        fetchUsers()
    }, [])

    const filtered = users.filter(
        (u) =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            (u.role && u.role.toLowerCase().includes(search.toLowerCase()))
    )

    const handleSelect = async (user: UserInfo) => {
        setSelectingId(user.id)
        try {
            await onSelectUser(user)
        } finally {
            setSelectingId(null)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6 flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">New Direct Message</h3>
                        <p className="text-xs text-slate-500">Select a team member to start a private 1-on-1 conversation</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                <div className="relative mb-4">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search team member by name or role..."
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#002147]/30 focus:border-[#002147]"
                        autoFocus
                    />
                </div>

                <div className="flex-1 overflow-y-auto min-h-[240px]">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-[#002147]" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-12">No team members found</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-0.5">
                            {filtered.map((user) => (
                                <button
                                    key={user.id}
                                    disabled={selectingId !== null}
                                    onClick={() => handleSelect(user)}
                                    className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200/80 bg-white hover:bg-blue-50/60 hover:border-blue-300 disabled:opacity-50 transition-all text-left shadow-xs group"
                                >
                                    <div className="h-10 w-10 rounded-full bg-[#002147] text-white text-sm font-bold flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                        {selectingId === user.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                                        ) : (
                                            initial(user.name)
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                                        <p className="text-xs text-slate-500 truncate">
                                            <span className="font-semibold text-[#002147]">{user.role}</span>
                                            {user.department ? ` · ${user.department}` : ""}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}

// ─── Main Chat Page ─────────────────────────────────────
export default function ChatPageClient({ currentUser }: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialChannelId = searchParams?.get("channel") ?? null

    const [channels, setChannels] = useState<Channel[]>([])
    const [activeChannelId, setActiveChannelId] = useState<string | null>(initialChannelId)
    const [messages, setMessages] = useState<Message[]>([])
    const [text, setText] = useState("")
    const [loading, setLoading] = useState(true)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [sending, setSending] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [uploadingVoice, setUploadingVoice] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showDmModal, setShowDmModal] = useState(false)
    const [mobileSidebar, setMobileSidebar] = useState(true)
    const [sidebarSearch, setSidebarSearch] = useState("")

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    const lastPollTimeRef = useRef<string | null>(null)
    const pollingRef = useRef<NodeJS.Timeout | null>(null)

    const scrollToBottom = useCallback((smooth = true) => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" })
        }, 50)
    }, [])

    // ── Load channels ─────────────────────────────────────
    useEffect(() => {
        const loadChannels = async () => {
            setLoading(true)
            try {
                const res = await fetch("/api/chat/channels")
                if (res.ok) {
                    const data = await res.json()
                    setChannels(data)
                    if (!activeChannelId && data.length > 0) {
                        const target = initialChannelId
                            ? data.find((c: Channel) => c.id === initialChannelId) || data[0]
                            : data[0]
                        setActiveChannelId(target.id)
                        setMobileSidebar(false)
                    }
                }
            } finally {
                setLoading(false)
            }
        }
        loadChannels()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ── Load messages when channel changes ────────────────
    useEffect(() => {
        if (!activeChannelId) return

        const loadMessages = async () => {
            setLoadingMessages(true)
            try {
                const res = await fetch(`/api/chat/channels/${activeChannelId}/messages?limit=50`)
                if (res.ok) {
                    const data = await res.json()
                    setMessages(data.messages)
                    setHasMore(data.hasMore)
                    lastPollTimeRef.current =
                        data.messages.length > 0
                            ? data.messages[data.messages.length - 1].createdAt
                            : new Date().toISOString()
                    scrollToBottom(false)
                }
            } finally {
                setLoadingMessages(false)
            }

            fetch(`/api/chat/channels/${activeChannelId}/read`, { method: "POST" }).catch(() => {})
        }

        loadMessages()
    }, [activeChannelId, scrollToBottom])

    // ── Polling for new messages ──────────────────────────
    useEffect(() => {
        if (!activeChannelId) return

        pollingRef.current = setInterval(async () => {
            if (!lastPollTimeRef.current || !activeChannelId) return
            try {
                const res = await fetch(
                    `/api/chat/channels/${activeChannelId}/messages?after=${encodeURIComponent(lastPollTimeRef.current)}&limit=50`
                )
                if (res.ok) {
                    const data = await res.json()
                    if (data.messages.length > 0) {
                        setMessages((prev) => {
                            const existingIds = new Set(prev.map((m) => m.id))
                            const newMsgs = data.messages.filter((m: Message) => !existingIds.has(m.id))
                            if (newMsgs.length === 0) return prev
                            return [...prev, ...newMsgs]
                        })
                        lastPollTimeRef.current = data.messages[data.messages.length - 1].createdAt
                        scrollToBottom()
                        fetch(`/api/chat/channels/${activeChannelId}/read`, { method: "POST" }).catch(() => {})
                    }
                }
            } catch {
                // Silently ignore polling errors
            }
        }, 5000)

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current)
        }
    }, [activeChannelId, scrollToBottom])

    // ── Refresh channels list ─────────────────────────────
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch("/api/chat/channels")
                if (res.ok) {
                    const data = await res.json()
                    setChannels(data)
                }
            } catch { /* silent */ }
        }, 15000)

        return () => clearInterval(interval)
    }, [])

    // ── Load older messages ───────────────────────────────
    const loadOlder = async () => {
        if (!activeChannelId || messages.length === 0) return
        const firstMsg = messages[0]
        try {
            const res = await fetch(
                `/api/chat/channels/${activeChannelId}/messages?before=${firstMsg.id}&limit=50`
            )
            if (res.ok) {
                const data = await res.json()
                setMessages((prev) => [...data.messages, ...prev])
                setHasMore(data.hasMore)
            }
        } catch { /* ignore */ }
    }

    // ── Send text message ─────────────────────────────────
    const sendMessage = async () => {
        if (!text.trim() || !activeChannelId || sending) return

        const content = text.trim()
        setText("")
        setSending(true)

        try {
            const res = await fetch(`/api/chat/channels/${activeChannelId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            })
            if (res.ok) {
                const msg = await res.json()
                setMessages((prev) => {
                    if (prev.some((m) => m.id === msg.id)) return prev
                    return [...prev, msg]
                })
                lastPollTimeRef.current = msg.createdAt
                scrollToBottom()
            }
        } finally {
            setSending(false)
        }
    }

    // ── Send voice note ───────────────────────────────────
    const sendVoice = async (blob: Blob, duration: number) => {
        if (!activeChannelId) return
        setIsRecording(false)
        setUploadingVoice(true)

        try {
            const formData = new FormData()
            formData.append("audio", blob, "voice-note.webm")
            formData.append("duration", duration.toString())

            const res = await fetch(`/api/chat/channels/${activeChannelId}/voice`, {
                method: "POST",
                body: formData,
            })

            if (res.ok) {
                const msg = await res.json()
                setMessages((prev) => {
                    if (prev.some((m) => m.id === msg.id)) return prev
                    return [...prev, msg]
                })
                lastPollTimeRef.current = msg.createdAt
                scrollToBottom()
            }
        } finally {
            setUploadingVoice(false)
        }
    }

    // ── Open or create DM with target user ───────────────
    const startDmWithUser = async (targetUser: UserInfo) => {
        try {
            const res = await fetch("/api/chat/dm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetUserId: Number(targetUser.id) }),
            })
            if (res.ok) {
                const dmChannel = await res.json()
                setChannels((prev) => {
                    const existingIndex = prev.findIndex((c) => c.id === dmChannel.id)
                    if (existingIndex >= 0) {
                        const updated = [...prev]
                        updated[existingIndex] = { ...updated[existingIndex], ...dmChannel }
                        return updated
                    }
                    return [{ ...dmChannel, unreadCount: 0 }, ...prev]
                })
                setActiveChannelId(dmChannel.id)
                setShowDmModal(false)
                setMobileSidebar(false)
            } else {
                const errorData = await res.json().catch(() => ({}))
                alert(errorData.error || "Failed to start direct message.")
            }
        } catch (err) {
            console.error("Start DM error:", err)
            alert("Error starting direct message. Please try again.")
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const selectChannel = (id: string) => {
        setActiveChannelId(id)
        setMessages([])
        setMobileSidebar(false)
    }

    const activeChannel = channels.find((c) => c.id === activeChannelId)
    const filteredChannels = channels.filter((c) =>
        c.name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
        (c.targetUser?.role && c.targetUser.role.toLowerCase().includes(sidebarSearch.toLowerCase()))
    )
    const groupChannels = filteredChannels.filter((c) => !c.isDirect)
    const dmChannels = filteredChannels.filter((c) => c.isDirect)
    const totalUnread = channels.reduce((sum, c) => sum + (c.id === activeChannelId ? 0 : c.unreadCount), 0)

    // ── Render ────────────────────────────────────────────
    return (
        <main className="h-screen flex flex-col bg-slate-100 overflow-hidden font-sans text-slate-900">
            {/* Top Bar */}
            <div className="h-16 flex items-center gap-3 px-4 sm:px-6 bg-gradient-to-r from-[#002147] via-[#002b5c] to-[#001833] text-white shrink-0 shadow-lg border-b border-blue-900/40 z-40">
                <button
                    onClick={() => router.push("/crm-dashboard")}
                    className="p-2 rounded-xl hover:bg-white/15 transition-all text-white/90 hover:text-white"
                    title="Back to CRM Dashboard"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">Team Chat</h1>
                        <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30 rounded-full">
                            CRM
                        </span>
                    </div>
                    <p className="text-xs text-blue-200/80 truncate font-medium">
                        {activeChannel ? (
                            activeChannel.isDirect ? (
                                `💬 Direct Chat with ${activeChannel.name} ${activeChannel.targetUser?.role ? `(${activeChannel.targetUser.role})` : ""}`
                            ) : (
                                `#${activeChannel.name} · ${activeChannel.memberCount} members`
                            )
                        ) : (
                            "Select a conversation"
                        )}
                    </p>
                </div>
                {/* Mobile sidebar toggle */}
                <button
                    onClick={() => setMobileSidebar(!mobileSidebar)}
                    className="p-2 rounded-xl hover:bg-white/15 transition-all lg:hidden relative text-white"
                >
                    <Hash className="h-5 w-5" />
                    {totalUnread > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-extrabold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1 shadow-sm">
                            {totalUnread > 99 ? "99+" : totalUnread}
                        </span>
                    )}
                </button>
            </div>

            <div className="flex flex-1 min-h-0 relative overflow-hidden">
                {/* ── Sidebar ────────────────────────────────── */}
                <aside
                    className={`
                        ${mobileSidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                        absolute lg:relative inset-y-0 left-0 z-30
                        w-80 bg-white border-r border-slate-200/80 flex flex-col shadow-sm
                        transition-transform duration-200 ease-in-out shrink-0
                    `}
                >
                    {/* Sidebar Search */}
                    <div className="p-3 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={sidebarSearch}
                                onChange={(e) => setSidebarSearch(e.target.value)}
                                placeholder="Search channels or team..."
                                className="w-full rounded-xl border border-slate-200/80 bg-slate-50 pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#002147]/20 focus:border-[#002147] transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-5">
                        {/* Group Channels Section */}
                        <div>
                            <div className="flex items-center justify-between px-2 py-1 mb-1.5">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Group Channels</span>
                                {isAdmin(currentUser.role) && (
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#002147] transition-colors"
                                        title="Create Group Channel"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            <div className="space-y-1">
                                {loading ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                    </div>
                                ) : groupChannels.length === 0 ? (
                                    <p className="text-xs text-slate-400 px-2 py-2 italic">No group channels found</p>
                                ) : (
                                    groupChannels.map((ch) => {
                                        const isActive = ch.id === activeChannelId
                                        return (
                                            <button
                                                key={ch.id}
                                                onClick={() => selectChannel(ch.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm font-medium ${
                                                    isActive
                                                        ? "bg-[#002147] text-white shadow-md shadow-[#002147]/20"
                                                        : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                                                }`}
                                            >
                                                <Hash className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-200" : "text-slate-400"}`} />
                                                <span className="flex-1 truncate">{ch.name}</span>
                                                {ch.unreadCount > 0 && !isActive && (
                                                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 shadow-sm">
                                                        {ch.unreadCount > 99 ? "99+" : ch.unreadCount}
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* Direct Messages Section */}
                        <div>
                            <div className="flex items-center justify-between px-2 py-1 mb-1.5">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Direct Messages</span>
                                <button
                                    onClick={() => setShowDmModal(true)}
                                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#002147] transition-colors"
                                    title="Start 1-on-1 Chat"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="space-y-1">
                                {dmChannels.length === 0 ? (
                                    <button
                                        onClick={() => setShowDmModal(true)}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#002147] font-semibold hover:bg-blue-50/80 rounded-xl transition-colors"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Start 1-on-1 Chat</span>
                                    </button>
                                ) : (
                                    dmChannels.map((ch) => {
                                        const isActive = ch.id === activeChannelId
                                        return (
                                            <button
                                                key={ch.id}
                                                onClick={() => selectChannel(ch.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm ${
                                                    isActive
                                                        ? "bg-[#002147] text-white shadow-md shadow-[#002147]/20 font-medium"
                                                        : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                                                }`}
                                            >
                                                <div
                                                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${
                                                        isActive
                                                            ? "bg-blue-200 text-[#002147]"
                                                            : "bg-[#002147] text-white"
                                                    }`}
                                                >
                                                    {initial(ch.name)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="truncate leading-tight font-semibold text-xs sm:text-sm">{ch.name}</p>
                                                    {ch.targetUser && (
                                                        <p className={`text-[10px] font-semibold uppercase tracking-wider truncate ${isActive ? "text-blue-200" : "text-slate-400"}`}>
                                                            {ch.targetUser.role}
                                                        </p>
                                                    )}
                                                </div>
                                                {ch.unreadCount > 0 && !isActive && (
                                                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 shadow-sm">
                                                        {ch.unreadCount > 99 ? "99+" : ch.unreadCount}
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Logged in User Profile Footer */}
                    <div className="p-3 bg-slate-50/80 border-t border-slate-200/80">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-[#002147] text-white text-xs font-bold flex items-center justify-center shadow-sm shrink-0">
                                {initial(currentUser.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-800 truncate">{currentUser.role}</p>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Mobile Overlay */}
                {mobileSidebar && (
                    <div
                        className="absolute inset-0 bg-black/30 z-20 lg:hidden backdrop-blur-xs"
                        onClick={() => setMobileSidebar(false)}
                    />
                )}

                {/* ── Messages Area ──────────────────────────── */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] relative">
                    {!activeChannelId ? (
                        <div className="flex-1 flex items-center justify-center p-6">
                            <div className="text-center max-w-sm">
                                <div className="h-16 w-16 rounded-2xl bg-blue-50 text-[#002147] flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
                                    <MessageSquare className="h-8 w-8" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Moksh CRM Team Chat</h3>
                                <p className="mt-1 text-xs text-slate-500">Select a group channel or team member to start coordinating</p>
                                <button
                                    onClick={() => setShowDmModal(true)}
                                    className="mt-5 px-4 py-2.5 bg-[#002147] text-white text-xs font-semibold rounded-xl hover:bg-[#003366] transition-all shadow-md"
                                >
                                    + Start 1-on-1 Chat
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Messages list */}
                            <div
                                ref={messagesContainerRef}
                                className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-2.5"
                            >
                                {hasMore && (
                                    <div className="text-center py-2">
                                        <button
                                            onClick={loadOlder}
                                            className="text-xs text-[#002147] hover:underline font-semibold bg-white border border-slate-200 px-3 py-1 rounded-full shadow-xs"
                                        >
                                            ↑ Load older messages
                                        </button>
                                    </div>
                                )}

                                {loadingMessages ? (
                                    <div className="flex items-center justify-center py-20">
                                        <Loader2 className="h-6 w-6 animate-spin text-[#002147]" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex items-center justify-center py-20">
                                        <div className="text-center bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm max-w-xs">
                                            <p className="text-slate-600 text-xs font-medium">No messages in this chat yet.</p>
                                            <p className="text-slate-400 text-[11px] mt-1">Send a message or voice note to begin!</p>
                                        </div>
                                    </div>
                                ) : (
                                    <AnimatePresence initial={false}>
                                        {messages.map((msg, idx) => {
                                            const isOwn = msg.senderId === currentUser.id
                                            const showDate = idx === 0 || !isSameDay(messages[idx - 1].createdAt, msg.createdAt)
                                            const showAvatar =
                                                idx === 0 ||
                                                messages[idx - 1].senderId !== msg.senderId ||
                                                showDate

                                            return (
                                                <div key={msg.id}>
                                                    {/* Centered Date Separator Pill */}
                                                    {showDate && (
                                                        <div className="flex justify-center my-4 sticky top-2 z-10">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white/95 backdrop-blur border border-slate-200/80 px-3 py-1 rounded-full shadow-xs">
                                                                {formatDate(msg.createdAt)}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <motion.div
                                                        initial={{ opacity: 0, y: 6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                        className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : "flex-row"} ${showAvatar ? "mt-3" : "mt-1"}`}
                                                    >
                                                        {/* Avatar for receiver */}
                                                        <div className="w-8 shrink-0">
                                                            {showAvatar && !msg.isSystem && (
                                                                <div
                                                                    className={`h-8 w-8 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-xs ${
                                                                        isOwn
                                                                            ? "bg-[#002147]"
                                                                            : "bg-slate-700"
                                                                    }`}
                                                                >
                                                                    {initial(msg.sender.name || "")}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Bubble Container */}
                                                        <div className={`max-w-[85%] sm:max-w-[70%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                                                            {showAvatar && !msg.isSystem && !isOwn && (
                                                                <span className="text-[11px] font-bold text-slate-700 mb-1 ml-1">
                                                                    {msg.sender.name}
                                                                </span>
                                                            )}
                                                            {msg.isSystem ? (
                                                                <div className="w-full text-center py-1">
                                                                    <span className="text-xs text-slate-500 italic bg-slate-200/60 px-3 py-1 rounded-full">
                                                                        {msg.content}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    className={`rounded-2xl px-4 py-2.5 shadow-sm text-sm relative group ${
                                                                        isOwn
                                                                            ? "bg-gradient-to-br from-[#002147] to-[#003875] text-white rounded-tr-xs border border-[#003875]/40"
                                                                            : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs"
                                                                    }`}
                                                                >
                                                                    {msg.type === "VOICE" && msg.mediaUrl ? (
                                                                        <VoicePlayer
                                                                            url={msg.mediaUrl}
                                                                            duration={msg.mediaDuration}
                                                                            isOwn={isOwn}
                                                                        />
                                                                    ) : (
                                                                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                                                                            {msg.content}
                                                                        </p>
                                                                    )}

                                                                    {/* Timestamp & Status */}
                                                                    <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-medium tabular-nums ${
                                                                        isOwn ? "text-blue-100/90" : "text-slate-400"
                                                                    }`}>
                                                                        <span>{formatTime(msg.createdAt)}</span>
                                                                        {isOwn && <CheckCheck className="h-3 w-3 text-blue-200" />}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                </div>
                                            )
                                        })}
                                    </AnimatePresence>
                                )}

                                {uploadingVoice && (
                                    <div className="flex justify-end gap-2.5 mt-3">
                                        <div className="w-8" />
                                        <div className="bg-[#002147] text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-md flex items-center gap-2.5">
                                            <Loader2 className="h-4 w-4 animate-spin text-blue-200" />
                                            <span className="text-xs font-semibold">Uploading voice note...</span>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* ── Input Bar ──────────────────────────── */}
                            <div className="shrink-0 border-t border-slate-200/80 bg-white px-4 py-3 shadow-lg z-20">
                                <AnimatePresence mode="wait">
                                    {isRecording ? (
                                        <VoiceRecorder
                                            key="recorder"
                                            onSend={sendVoice}
                                            onCancel={() => setIsRecording(false)}
                                        />
                                    ) : (
                                        <motion.div
                                            key="text-input"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex items-center gap-2.5"
                                        >
                                            <button
                                                onClick={() => setIsRecording(true)}
                                                className="shrink-0 p-2.5 rounded-full bg-slate-100 text-slate-600 hover:text-[#002147] hover:bg-slate-200 transition-all shadow-xs"
                                                title="Record Voice Note"
                                            >
                                                <Mic className="h-5 w-5" />
                                            </button>
                                            <textarea
                                                value={text}
                                                onChange={(e) => setText(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Type your message..."
                                                rows={1}
                                                className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#002147]/20 focus:border-[#002147] focus:bg-white placeholder:text-slate-400 max-h-32 transition-all shadow-inner"
                                                style={{ minHeight: 42 }}
                                                onInput={(e) => {
                                                    const target = e.target as HTMLTextAreaElement
                                                    target.style.height = "auto"
                                                    target.style.height = Math.min(target.scrollHeight, 128) + "px"
                                                }}
                                            />
                                            <button
                                                onClick={sendMessage}
                                                disabled={!text.trim() || sending}
                                                className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#002147] to-[#003875] text-white shadow-md hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all"
                                                title="Send Message"
                                            >
                                                {sending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Send className="h-4 w-4" />
                                                )}
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Create Group Channel Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateChannelModal
                        onClose={() => setShowCreateModal(false)}
                        onCreated={(ch) => {
                            setChannels((prev) => [ch, ...prev])
                            setActiveChannelId(ch.id)
                            setMobileSidebar(false)
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Start 1-on-1 DM Modal */}
            <AnimatePresence>
                {showDmModal && (
                    <NewDmModal
                        onClose={() => setShowDmModal(false)}
                        onSelectUser={startDmWithUser}
                    />
                )}
            </AnimatePresence>
        </main>
    )
}
