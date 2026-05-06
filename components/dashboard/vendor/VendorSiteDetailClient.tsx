"use client"

import { useMemo, useState } from "react"
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

export default function VendorSiteDetailClient({ assignment }: { assignment: AssignmentDetail }) {
    const router = useRouter()

    const [files, setFiles] = useState<File[]>([])
    const [latitude, setLatitude] = useState<number | null>(null)
    const [longitude, setLongitude] = useState<number | null>(null)
    const [accuracy, setAccuracy] = useState<number | null>(null)
    const [capturingLocation, setCapturingLocation] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const fileStats = useMemo(() => {
        let photos = 0
        let videos = 0
        for (const f of files) {
            if (f.type.startsWith("image/")) photos += 1
            if (f.type.startsWith("video/")) videos += 1
        }
        return { photos, videos }
    }, [files])

    const isClientValid = useMemo(() => {
        if (files.length === 0) return false
        if (fileStats.photos > MAX_PHOTOS || fileStats.videos > MAX_VIDEOS) return false
        if (latitude === null || longitude === null) return false
        return true
    }, [files.length, fileStats.photos, fileStats.videos, latitude, longitude])

    const captureLocation = () => {
        setError("")
        setSuccess("")
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by this browser.")
            return
        }

        setCapturingLocation(true)
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitude(position.coords.latitude)
                setLongitude(position.coords.longitude)
                setAccuracy(position.coords.accuracy || null)
                setCapturingLocation(false)
            },
            () => {
                setError("Location permission denied or unavailable.")
                setCapturingLocation(false)
            },
            { enableHighAccuracy: true, timeout: 15000 }
        )
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
                            accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                            onChange={(e) => setFiles(Array.from(e.target.files || []))}
                            className="block w-full text-sm text-gray-700"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Selected: {fileStats.photos} photo(s), {fileStats.videos} video(s)
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={captureLocation}
                            disabled={capturingLocation}
                            className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50"
                        >
                            {capturingLocation ? "Capturing..." : "Capture Current Location"}
                        </button>
                        {latitude !== null && longitude !== null && (
                            <div className="text-sm text-green-700">
                                Location captured: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                            </div>
                        )}
                    </div>

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

