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

const MAX_PHOTOS = 5
const MAX_VIDEOS = 2

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

export default function VendorSiteDetailClient({ assignment }: { assignment: AssignmentDetail }) {
    const router = useRouter()
    const photoInputRef = useRef<HTMLInputElement | null>(null)
    const videoInputRef = useRef<HTMLInputElement | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const autoLocationRequested = useRef(false)

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

    const appendFiles = (incomingFiles: File[]) => {
        setError("")
        setSuccess("")
        if (!incomingFiles.length) return

        const merged = [...files, ...incomingFiles]
        let photoCount = 0
        let videoCount = 0

        for (const f of merged) {
            if (isImageFile(f)) photoCount += 1
            if (isVideoFile(f)) videoCount += 1
        }

        if (photoCount > MAX_PHOTOS) {
            setError(`You can upload up to ${MAX_PHOTOS} photos.`)
            return
        }
        if (videoCount > MAX_VIDEOS) {
            setError(`You can upload up to ${MAX_VIDEOS} videos.`)
            return
        }

        setFiles(merged)
    }

    const submitProof = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess("")

        if (!isClientValid) {
            setError("Select valid media and capture location before submitting.")
            return
        }

        setUploading(true)
        try {
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
                throw new Error(text || "Upload failed")
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
                    <p className="text-sm text-gray-600">Upload up to 5 photos and 2 videos. Location is mandatory.</p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Media Files</label>
                            <input
                                type="file"
                                multiple
                                ref={fileInputRef}
                                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm"
                                onChange={(e) => appendFiles(Array.from(e.target.files || []))}
                                className="block w-full text-sm text-gray-700"
                            />
                        <p className="text-xs text-gray-500 mt-1">
                            Selected: {fileStats.photos} photo(s), {fileStats.videos} video(s)
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
                            onClick={() => videoInputRef.current?.click()}
                            className="px-3 py-2 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50"
                        >
                            Capture Video
                        </button>
                        <button
                            type="button"
                            onClick={() => setFiles([])}
                            className="px-3 py-2 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50"
                        >
                            Clear Selected
                        </button>
                    </div>

                    <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={(e) => appendFiles(Array.from(e.target.files || []))}
                    />
                    <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={(e) => appendFiles(Array.from(e.target.files || []))}
                    />

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
