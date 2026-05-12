"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

type ProofMedia = {
    id: string
    type: "PHOTO" | "VIDEO"
    url: string
    fileName: string
    mimeType: string
}

type ProofRow = {
    id: string
    status: string
    submittedAt?: string | null
    rejectedAt?: string | null
    rejectionReason?: string | null
    media: ProofMedia[]
}

type AssignmentDetail = {
    id: string
    status: string
    notes?: string | null
    inventoryHoarding: {
        inventoryCode?: string | null
        outletName: string
        locationName: string
        city?: string | null
        district?: string | null
        state?: string | null
        imageUrl?: string | null
    }
    lead?: {
        customerName: string
    } | null
    proofs: ProofRow[]
}

type PresignedUploadItem = {
    mediaType: "PHOTO" | "VIDEO"
    fileName: string
    mimeType: string
    size: number
    key: string
    uploadUrl: string
    publicUrl: string
}

const MAX_PHOTOS = 10
const MAX_VIDEOS = 5
const MAX_VIDEO_DURATION_SECONDS = 60
const MAX_TOTAL_UPLOAD_BYTES = 100 * 1024 * 1024
const MAX_VIDEO_FILE_BYTES = 50 * 1024 * 1024
const IMAGE_COMPRESS_THRESHOLD_BYTES = 1200 * 1024 // compress images above ~1.2 MB
const RECORDER_VIDEO_BITS_PER_SECOND = 1_500_000
const RECORDER_AUDIO_BITS_PER_SECOND = 96_000

const statusClass: Record<string, string> = {
    ASSIGNED_TO_VENDOR: "bg-blue-100 text-blue-800",
    PENDING_VENDOR_UPLOAD: "bg-blue-100 text-blue-800",
    SUBMITTED_FOR_APPROVAL: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    CLIENT_NOTIFIED: "bg-green-100 text-green-800",
    REUPLOAD_REQUESTED: "bg-orange-100 text-orange-800",
    REJECTED: "bg-red-100 text-red-800",
}

const canUploadForStatus = (status: string) =>
    ["ASSIGNED_TO_VENDOR", "PENDING_VENDOR_UPLOAD", "REUPLOAD_REQUESTED", "REJECTED"].includes(status)

const isVideoFile = (file: File) => {
    const mime = (file.type || "").toLowerCase()
    if (mime.startsWith("video/")) return true
    const name = (file.name || "").toLowerCase()
    return name.endsWith(".mp4") || name.endsWith(".mov") || name.endsWith(".webm")
}

const isImageFile = (file: File) => {
    const mime = (file.type || "").toLowerCase()
    if (mime.startsWith("image/")) return true
    const name = (file.name || "").toLowerCase()
    return (
        name.endsWith(".jpg") ||
        name.endsWith(".jpeg") ||
        name.endsWith(".png") ||
        name.endsWith(".webp") ||
        name.endsWith(".heic") ||
        name.endsWith(".heif")
    )
}

const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const compressImageFile = async (file: File): Promise<File> => {
    if (!isImageFile(file) || file.size <= IMAGE_COMPRESS_THRESHOLD_BYTES) return file

    const fileUrl = URL.createObjectURL(file)
    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = fileUrl
        })

        const maxWidth = 1600
        const maxHeight = 1600
        let width = image.width
        let height = image.height

        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            width = Math.round(width * ratio)
            height = Math.round(height * ratio)
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) return file

        ctx.drawImage(image, 0, 0, width, height)

        const compressedBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.72)
        })
        if (!compressedBlob) return file

        const compressedFile = new File(
            [compressedBlob],
            file.name.replace(/\.(png|webp|heic|heif)$/i, ".jpg"),
            { type: "image/jpeg" }
        )

        // If no gain, keep original
        if (compressedFile.size >= file.size) return file
        return compressedFile
    } catch {
        return file
    } finally {
        URL.revokeObjectURL(fileUrl)
    }
}

const getVideoDurationSeconds = async (file: File): Promise<number | null> => {
    if (!isVideoFile(file)) return null

    const objectUrl = URL.createObjectURL(file)
    try {
        const duration = await new Promise<number | null>((resolve) => {
            const video = document.createElement("video")
            video.preload = "metadata"
            video.onloadedmetadata = () => resolve(Number.isFinite(video.duration) ? video.duration : null)
            video.onerror = () => resolve(null)
            video.src = objectUrl
        })
        return duration
    } finally {
        URL.revokeObjectURL(objectUrl)
    }
}

const selectRecorderMimeType = () => {
    if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return ""

    const candidates = [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4",
        "video/webm;codecs=vp8,opus",
        "video/webm"
    ]

    for (const candidate of candidates) {
        if (MediaRecorder.isTypeSupported(candidate)) return candidate
    }

    return ""
}

export default function VendorSiteDetailClient({ assignment }: { assignment: AssignmentDetail }) {
    const router = useRouter()
    const photoInputRef = useRef<HTMLInputElement | null>(null)
    const videoInputRef = useRef<HTMLInputElement | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const liveRecorderPreviewRef = useRef<HTMLVideoElement | null>(null)
    const autoLocationRequested = useRef(false)
    const recorderRef = useRef<MediaRecorder | null>(null)
    const recorderStreamRef = useRef<MediaStream | null>(null)
    const recorderChunksRef = useRef<Blob[]>([])
    const recorderShouldSaveRef = useRef(true)
    const recorderStopTimeoutRef = useRef<number | null>(null)
    const recorderCountdownIntervalRef = useRef<number | null>(null)

    const [files, setFiles] = useState<File[]>([])
    const [latitude, setLatitude] = useState<number | null>(null)
    const [longitude, setLongitude] = useState<number | null>(null)
    const [accuracy, setAccuracy] = useState<number | null>(null)
    const [locationCapturedAt, setLocationCapturedAt] = useState<Date | null>(null)
    const [capturingLocation, setCapturingLocation] = useState(false)
    const [gpsStatus, setGpsStatus] = useState<"idle" | "capturing" | "locked" | "failed">("idle")
    const [gpsMessage, setGpsMessage] = useState("Waiting for GPS permission.")
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [recordingSupported, setRecordingSupported] = useState(false)
    const [recordingStarting, setRecordingStarting] = useState(false)
    const [recordingInProgress, setRecordingInProgress] = useState(false)
    const [recordingSecondsLeft, setRecordingSecondsLeft] = useState(MAX_VIDEO_DURATION_SECONDS)

    const fileStats = useMemo(() => {
        let photos = 0
        let videos = 0
        for (const f of files) {
            if (isImageFile(f)) photos += 1
            if (isVideoFile(f)) videos += 1
        }
        return { photos, videos }
    }, [files])

    const previewUrls = useMemo(() => {
        return files.map((file) => ({
            file,
            url: URL.createObjectURL(file)
        }))
    }, [files])

    useEffect(() => {
        return () => {
            previewUrls.forEach((entry) => URL.revokeObjectURL(entry.url))
        }
    }, [previewUrls])

    const isClientValid = useMemo(() => {
        if (files.length === 0) return false
        if (fileStats.photos > MAX_PHOTOS || fileStats.videos > MAX_VIDEOS) return false
        if (latitude === null || longitude === null) return false
        return true
    }, [files.length, fileStats.photos, fileStats.videos, latitude, longitude])

    const requestCurrentPosition = (options: PositionOptions) =>
        new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, options)
        })

    const captureLocation = async (silent = false) => {
        if (capturingLocation) return
        if (!silent) {
            setError("")
            setSuccess("")
        }
        if (!navigator.geolocation) {
            if (!silent) setError("Geolocation is not supported by this browser.")
            setGpsStatus("failed")
            setGpsMessage("GPS not supported on this device/browser.")
            return
        }

        setCapturingLocation(true)
        setGpsStatus("capturing")
        setGpsMessage("Acquiring high-accuracy GPS lock...")

        try {
            const primary = await requestCurrentPosition({
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 0,
            })

            setLatitude(primary.coords.latitude)
            setLongitude(primary.coords.longitude)
            setAccuracy(primary.coords.accuracy || null)
            setLocationCapturedAt(new Date())
            setGpsStatus("locked")
            setGpsMessage("High-accuracy GPS lock acquired.")
            setCapturingLocation(false)
            return
        } catch {
            setGpsMessage("High-accuracy lock timed out. Retrying fallback...")
        }

        try {
            const fallback = await requestCurrentPosition({
                enableHighAccuracy: false,
                timeout: 20000,
                maximumAge: 15000,
            })

            setLatitude(fallback.coords.latitude)
            setLongitude(fallback.coords.longitude)
            setAccuracy(fallback.coords.accuracy || null)
            setLocationCapturedAt(new Date())
            setGpsStatus("locked")
            setGpsMessage("Fallback GPS lock acquired.")
        } catch (error: any) {
            const errorCode = typeof error?.code === "number" ? error.code : null
            const denied = errorCode === 1
            const unavailable = errorCode === 2
            const timedOut = errorCode === 3
            const fallbackMessage = denied
                ? "Location permission denied."
                : unavailable
                    ? "Location unavailable. Move to open area and retry."
                    : timedOut
                        ? "Location request timed out."
                        : "Unable to capture location."

            setGpsStatus("failed")
            setGpsMessage(fallbackMessage)
            if (!silent) setError(fallbackMessage)
        } finally {
            setCapturingLocation(false)
        }
    }

    useEffect(() => {
        if (!canUploadForStatus(assignment.status)) return
        if (autoLocationRequested.current) return
        autoLocationRequested.current = true
        void captureLocation(true)
    }, [assignment.status])

    useEffect(() => {
        const canUse =
            typeof window !== "undefined" &&
            typeof navigator !== "undefined" &&
            !!navigator.mediaDevices?.getUserMedia &&
            typeof MediaRecorder !== "undefined"

        setRecordingSupported(canUse)
    }, [])

    const clearRecorderTimers = () => {
        if (recorderStopTimeoutRef.current !== null) {
            window.clearTimeout(recorderStopTimeoutRef.current)
            recorderStopTimeoutRef.current = null
        }
        if (recorderCountdownIntervalRef.current !== null) {
            window.clearInterval(recorderCountdownIntervalRef.current)
            recorderCountdownIntervalRef.current = null
        }
    }

    const stopRecorderStream = () => {
        const stream = recorderStreamRef.current
        if (stream) {
            stream.getTracks().forEach((track) => track.stop())
            recorderStreamRef.current = null
        }

        const preview = liveRecorderPreviewRef.current
        if (preview) {
            preview.pause()
            preview.srcObject = null
        }
    }

    const stopRecording = (saveCapture: boolean) => {
        recorderShouldSaveRef.current = saveCapture
        const recorder = recorderRef.current
        if (!recorder) {
            clearRecorderTimers()
            stopRecorderStream()
            setRecordingInProgress(false)
            setRecordingStarting(false)
            return
        }

        if (recorder.state !== "inactive") {
            recorder.stop()
        } else {
            clearRecorderTimers()
            stopRecorderStream()
            recorderRef.current = null
            setRecordingInProgress(false)
            setRecordingStarting(false)
        }
    }

    const startInlineVideoCapture = async () => {
        setError("")
        setSuccess("")

        if (recordingStarting || recordingInProgress) return

        const canUseInlineRecorder =
            typeof navigator !== "undefined" &&
            !!navigator.mediaDevices?.getUserMedia &&
            typeof MediaRecorder !== "undefined"

        if (!canUseInlineRecorder) {
            // Fallback for older iPhone/Safari devices
            videoInputRef.current?.click()
            return
        }

        setRecordingStarting(true)

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: true
            })

            recorderStreamRef.current = stream

            const preview = liveRecorderPreviewRef.current
            if (preview) {
                preview.muted = true
                preview.playsInline = true
                preview.autoplay = true
                preview.srcObject = stream
                await preview.play().catch(() => null)
            }

            const mimeType = selectRecorderMimeType()
            const recorderOptions: MediaRecorderOptions = {
                videoBitsPerSecond: RECORDER_VIDEO_BITS_PER_SECOND,
                audioBitsPerSecond: RECORDER_AUDIO_BITS_PER_SECOND,
            }
            if (mimeType) recorderOptions.mimeType = mimeType

            let recorder: MediaRecorder
            try {
                recorder = new MediaRecorder(stream, recorderOptions)
            } catch {
                recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
            }

            recorderChunksRef.current = []
            recorderShouldSaveRef.current = true
            recorderRef.current = recorder

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recorderChunksRef.current.push(event.data)
                }
            }

            recorder.onstop = async () => {
                clearRecorderTimers()
                stopRecorderStream()
                setRecordingInProgress(false)
                setRecordingStarting(false)
                setRecordingSecondsLeft(MAX_VIDEO_DURATION_SECONDS)
                recorderRef.current = null

                if (!recorderShouldSaveRef.current) return

                const outputMimeType = recorder.mimeType || mimeType || "video/mp4"
                const blob = new Blob(recorderChunksRef.current, { type: outputMimeType })
                recorderChunksRef.current = []

                if (blob.size === 0) {
                    setError("Video capture failed. Please retry.")
                    return
                }

                const extension = outputMimeType.includes("webm")
                    ? "webm"
                    : outputMimeType.includes("quicktime")
                        ? "mov"
                        : "mp4"

                const capturedFile = new File([blob], `capture-${Date.now()}.${extension}`, {
                    type: outputMimeType
                })

                await appendFiles([capturedFile])
            }

            recorder.onerror = () => {
                setError("Video recorder error. Please try again.")
                stopRecording(false)
            }

            setRecordingSecondsLeft(MAX_VIDEO_DURATION_SECONDS)
            setRecordingInProgress(true)
            setRecordingStarting(false)

            recorder.start(400)

            recorderStopTimeoutRef.current = window.setTimeout(() => {
                stopRecording(true)
            }, MAX_VIDEO_DURATION_SECONDS * 1000)

            recorderCountdownIntervalRef.current = window.setInterval(() => {
                setRecordingSecondsLeft((current) => {
                    if (current <= 1) return 0
                    return current - 1
                })
            }, 1000)
        } catch (err: any) {
            stopRecorderStream()
            clearRecorderTimers()
            setRecordingStarting(false)
            setRecordingInProgress(false)
            recorderRef.current = null

            const message = typeof err?.message === "string" ? err.message : ""
            if (message.toLowerCase().includes("permission")) {
                setError("Camera permission denied. Please allow camera access and retry.")
                return
            }

            setError("Unable to start camera recording on this device/browser.")
        }
    }

    useEffect(() => {
        return () => {
            recorderShouldSaveRef.current = false

            if (recorderStopTimeoutRef.current !== null) {
                window.clearTimeout(recorderStopTimeoutRef.current)
            }
            if (recorderCountdownIntervalRef.current !== null) {
                window.clearInterval(recorderCountdownIntervalRef.current)
            }

            const recorder = recorderRef.current
            if (recorder && recorder.state !== "inactive") {
                try {
                    recorder.stop()
                } catch {
                    // no-op cleanup
                }
            }

            const stream = recorderStreamRef.current
            if (stream) {
                stream.getTracks().forEach((track) => track.stop())
            }
        }
    }, [])

    const appendFiles = async (incomingFiles: File[]) => {
        setError("")
        setSuccess("")
        if (!incomingFiles.length) return

        const processedFiles: File[] = []
        for (const file of incomingFiles) {
            if (isVideoFile(file) && file.size > MAX_VIDEO_FILE_BYTES) {
                setError(`Video "${file.name}" is too large (${formatBytes(file.size)}). Keep each video under ${formatBytes(MAX_VIDEO_FILE_BYTES)}.`)
                return
            }

            if (isVideoFile(file)) {
                const durationSeconds = await getVideoDurationSeconds(file)
                if (durationSeconds !== null && durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
                    setError(`Video "${file.name}" is ${durationSeconds.toFixed(1)}s. Max allowed video duration is ${MAX_VIDEO_DURATION_SECONDS}s.`)
                    return
                }
            }

            const normalizedFile = isImageFile(file) ? await compressImageFile(file) : file
            processedFiles.push(normalizedFile)
        }

        const merged = [...files, ...processedFiles]
        let photoCount = 0
        let videoCount = 0
        let totalBytes = 0

        for (const f of merged) {
            if (isImageFile(f)) photoCount += 1
            if (isVideoFile(f)) videoCount += 1
            totalBytes += f.size
        }

        if (photoCount > MAX_PHOTOS) {
            setError(`You can upload up to ${MAX_PHOTOS} photos.`)
            return
        }
        if (videoCount > MAX_VIDEOS) {
            setError(`You can upload up to ${MAX_VIDEOS} videos.`)
            return
        }
        if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
            setError(`Total upload too large (${formatBytes(totalBytes)}). Keep combined files under ${formatBytes(MAX_TOTAL_UPLOAD_BYTES)}.`)
            return
        }

        setFiles(merged)
    }

    const uploadFilesViaPresignedUrls = async () => {
        const presignRes = await fetch("/api/vendor/uploads/presign", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                assignmentId: assignment.id,
                files: files.map((file) => ({
                    fileName: file.name,
                    mimeType: file.type || "",
                    size: file.size,
                })),
            }),
        })

        if (!presignRes.ok) {
            const text = await presignRes.text()
            throw new Error(text || "Unable to prepare direct upload")
        }

        const presignData = await presignRes.json() as { uploads?: PresignedUploadItem[] }
        const uploads = Array.isArray(presignData.uploads) ? presignData.uploads : []
        if (!uploads.length || uploads.length !== files.length) {
            throw new Error("Invalid upload session. Please retry.")
        }

        for (let i = 0; i < files.length; i += 1) {
            const file = files[i]
            const target = uploads[i]

            const uploadRes = await fetch(target.uploadUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": file.type || target.mimeType || "application/octet-stream",
                },
                body: file,
            })

            if (!uploadRes.ok) {
                throw new Error(`Failed to upload "${file.name}" to storage`)
            }
        }

        const submitRes = await fetch(`/api/vendor/assignments/${assignment.id}/upload-proof`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                latitude,
                longitude,
                accuracy,
                uploadedMedia: uploads.map((entry) => ({
                    key: entry.key,
                    fileName: entry.fileName,
                    mimeType: entry.mimeType,
                    size: entry.size,
                })),
            }),
        })

        if (!submitRes.ok) {
            const text = await submitRes.text()
            throw new Error(text || "Failed to submit uploaded proof")
        }
    }

    const submitProof = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess("")

        if (!isClientValid) {
            setError("Select valid media and capture location before submitting.")
            return
        }

        const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
        if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
            setError(`Upload too large (${formatBytes(totalBytes)}). Keep total under ${formatBytes(MAX_TOTAL_UPLOAD_BYTES)}.`)
            return
        }

        setUploading(true)
        try {
            try {
                await uploadFilesViaPresignedUrls()
            } catch (directUploadErr: any) {
                const message = String(directUploadErr?.message || "")

                // Fallback: local/dev or when direct S3 mode is unavailable
                if (
                    message.includes("Direct upload is unavailable in local storage mode") ||
                    message.includes("Unable to prepare direct upload")
                ) {
                    const formData = new FormData()
                    for (const file of files) formData.append("files", file)
                    formData.append("latitude", String(latitude))
                    formData.append("longitude", String(longitude))
                    if (accuracy !== null) formData.append("accuracy", String(accuracy))

                    const res = await fetch(`/api/vendor/assignments/${assignment.id}/upload-proof`, {
                        method: "POST",
                        body: formData
                    })
                    if (!res.ok) {
                        const text = await res.text()
                        if (res.status === 413 || text.includes("FUNCTION_PAYLOAD_TOO_LARGE")) {
                            throw new Error(`Upload too large for server. Keep total file size under ${formatBytes(MAX_TOTAL_UPLOAD_BYTES)} and each video under ${formatBytes(MAX_VIDEO_FILE_BYTES)}.`)
                        }
                        throw new Error(text || "Upload failed")
                    }
                } else {
                    throw directUploadErr
                }
            }

            setSuccess("Proof submitted for admin approval.")
            setFiles([])
            router.refresh()
        } catch (err: any) {
            setError(err.message || "Upload failed")
        } finally {
            setUploading(false)
        }
    }

    const site = assignment.inventoryHoarding
    const locationLabel = [site.locationName, site.city || site.district, site.state].filter(Boolean).join(", ")
    const latestProof = assignment.proofs[0]

    return (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{site.outletName}</h1>
                        <p className="text-sm text-gray-600 mt-1">Site ID: {site.inventoryCode || "-"}</p>
                        <p className="text-sm text-gray-600">{locationLabel || "-"}</p>
                        <p className="text-sm text-gray-600">Campaign/Client: {assignment.lead?.customerName || "-"}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusClass[assignment.status] || "bg-gray-100 text-gray-700"}`}>
                        {assignment.status}
                    </span>
                </div>
                {assignment.notes && (
                    <div className="mt-3 text-sm text-gray-700">
                        <span className="font-medium">Assignment Notes:</span> {assignment.notes}
                    </div>
                )}
                {latestProof?.rejectionReason && (
                    <div className="mt-3 bg-red-50 text-red-700 rounded-md px-3 py-2 text-sm">
                        Rejection reason: {latestProof.rejectionReason}
                    </div>
                )}
            </div>

            {canUploadForStatus(assignment.status) && (
                <form onSubmit={submitProof} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Upload Live Proof</h2>
                    <p className="text-sm text-gray-600">Upload up to 10 photos and 5 videos. Location is mandatory.</p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Media Files</label>
                            <input
                                type="file"
                                multiple
                                ref={fileInputRef}
                                accept="image/*,video/*"
                                onChange={(e) => void appendFiles(Array.from(e.target.files || []))}
                                className="block w-full text-sm text-gray-700"
                            />
                        <p className="text-xs text-gray-500 mt-1">
                            Selected: {fileStats.photos} photo(s), {fileStats.videos} video(s)
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                            Max total upload: {formatBytes(MAX_TOTAL_UPLOAD_BYTES)}. Videos: max {formatBytes(MAX_VIDEO_FILE_BYTES)} and {MAX_VIDEO_DURATION_SECONDS}s each.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => photoInputRef.current?.click()}
                            className="px-3 py-2 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50"
                        >
                            Capture Photo
                        </button>
                        <button
                            type="button"
                            onClick={() => void startInlineVideoCapture()}
                            disabled={recordingStarting || recordingInProgress}
                            className="px-3 py-2 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                        >
                            {recordingStarting ? "Opening Camera..." : recordingInProgress ? `Recording... ${recordingSecondsLeft}s` : "Capture Video (60s Auto Stop)"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setFiles([])
                                setError("")
                                setSuccess("")
                            }}
                            className="px-3 py-2 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50"
                        >
                            Clear Selected
                        </button>
                    </div>

                    <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => void appendFiles(Array.from(e.target.files || []))}
                    />
                    <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => void appendFiles(Array.from(e.target.files || []))}
                    />

                    {(recordingInProgress || recordingStarting) && (
                        <div className="border border-blue-200 rounded-md p-3 bg-blue-50">
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <p className="text-sm font-medium text-blue-800">
                                    {recordingStarting ? "Preparing camera..." : "Recording in progress"}
                                </p>
                                <p className="text-sm font-semibold text-blue-900">{recordingSecondsLeft}s</p>
                            </div>
                            <video
                                ref={liveRecorderPreviewRef}
                                muted
                                playsInline
                                autoPlay
                                className="w-full h-48 rounded-md bg-black object-cover"
                            />
                            <div className="mt-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => stopRecording(true)}
                                    className="px-3 py-2 rounded-md border border-blue-300 bg-white text-sm font-medium text-blue-800 hover:bg-blue-100"
                                >
                                    Stop Now
                                </button>
                            </div>
                        </div>
                    )}

                    {!recordingSupported && (
                        <p className="text-xs text-amber-700">
                            Inline recorder is not supported on this device/browser. Using native camera picker fallback.
                        </p>
                    )}

                    {previewUrls.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {previewUrls.map(({ file, url }, index) => (
                                <div key={`${file.name}-${index}`} className="border rounded-md overflow-hidden bg-gray-50">
                                    {isVideoFile(file) ? (
                                        <video src={url} controls className="w-full h-28 object-cover" />
                                    ) : (
                                        <img src={url} alt={file.name} className="w-full h-28 object-cover" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => void captureLocation(false)}
                            disabled={capturingLocation}
                            className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50"
                        >
                            {capturingLocation ? "Capturing..." : "Capture / Retry GPS Lock"}
                        </button>
                        <span
                            className={`text-xs px-2 py-1 rounded-full ${
                                gpsStatus === "locked"
                                    ? "bg-green-100 text-green-700"
                                    : gpsStatus === "capturing"
                                        ? "bg-blue-100 text-blue-700"
                                        : gpsStatus === "failed"
                                            ? "bg-red-100 text-red-700"
                                            : "bg-gray-100 text-gray-600"
                            }`}
                        >
                            GPS: {gpsStatus.toUpperCase()}
                        </span>
                        {latitude !== null && longitude !== null && (
                            <div className="text-sm text-green-700 space-y-0.5">
                                <div>Lat/Lng: {latitude.toFixed(6)}, {longitude.toFixed(6)}</div>
                                {accuracy !== null && <div>Accuracy: {accuracy.toFixed(2)} meters</div>}
                                {locationCapturedAt && <div>Captured: {locationCapturedAt.toLocaleString("en-IN")}</div>}
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-600">{gpsMessage}</p>

                    {error && <div className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
                    {success && <div className="rounded-md bg-green-50 text-green-700 px-3 py-2 text-sm">{success}</div>}

                    <button
                        type="submit"
                        disabled={!isClientValid || uploading}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50"
                    >
                        {uploading ? "Submitting..." : "Submit For Approval"}
                    </button>
                </form>
            )}

            <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Submission History</h2>
                <div className="space-y-4">
                    {assignment.proofs.length === 0 && (
                        <p className="text-sm text-gray-500">No proofs uploaded yet.</p>
                    )}
                    {assignment.proofs.map((proof) => (
                        <div key={proof.id} className="border border-gray-200 rounded-md p-3">
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusClass[proof.status] || "bg-gray-100 text-gray-700"}`}>
                                    {proof.status}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {proof.submittedAt ? new Date(proof.submittedAt).toLocaleString("en-IN") : "-"}
                                </span>
                            </div>
                            {proof.rejectionReason && (
                                <p className="text-sm text-red-700 mb-2">Reason: {proof.rejectionReason}</p>
                            )}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {proof.media.map((media) => (
                                    <div key={media.id} className="border rounded-md overflow-hidden bg-gray-50">
                                        {media.type === "PHOTO" ? (
                                            <img src={media.url} alt={media.fileName} className="w-full h-28 object-cover" />
                                        ) : (
                                            <video src={media.url} controls className="w-full h-28 object-cover" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
