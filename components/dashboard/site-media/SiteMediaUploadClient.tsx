"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Loader2, Upload } from "lucide-react"

type SiteMediaItem = {
    id: string
    type: "IMAGE" | "VIDEO"
    source: string
    key: string
    url: string | null
    fileName: string
    mimeType: string
    size: number
    sortOrder: number
    isActive: boolean
    uploadedById: number | null
    createdAt: string
    updatedAt: string
}

type SiteDetails = {
    id: number
    siteCode: string
    outletName: string
    locationName: string
    city: string | null
    district: string
    state: string
    view360Url: string | null
    fallbackImageUrl: string | null
    media: {
        images: SiteMediaItem[]
        videos: SiteMediaItem[]
    }
}

type UploadPayload = {
    type: "IMAGE" | "VIDEO"
    key: string
    fileName: string
    mimeType: string
    size: number
    uploadUrl: string
    publicUrl: string | null
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"])
const MAX_IMAGES = 5
const MAX_VIDEOS = 1

const fetchJson = async <T,>(url: string): Promise<T> => {
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) {
        throw new Error(await response.text())
    }
    return response.json() as Promise<T>
}

export default function SiteMediaUploadClient({
    siteId,
    initialSite,
}: {
    siteId: number
    initialSite: SiteDetails
}) {
    const [site, setSite] = useState<SiteDetails>(initialSite)
    const [images, setImages] = useState<File[]>([])
    const [video, setVideo] = useState<File | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const imagePreviews = useMemo(() => images.map((file) => ({ file, url: URL.createObjectURL(file) })), [images])
    const videoPreview = useMemo(() => (video ? URL.createObjectURL(video) : null), [video])

    useEffect(() => {
        return () => {
            imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url))
            if (videoPreview) URL.revokeObjectURL(videoPreview)
        }
    }, [imagePreviews, videoPreview])

    const refreshSite = async () => {
        const data = await fetchJson<{ site: SiteDetails }>(`/api/site-media/sites/${siteId}`)
        setSite(data.site)
    }

    const onImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextFiles = Array.from(event.target.files || [])

        setError("")
        setSuccess("")

        if (nextFiles.length > MAX_IMAGES) {
            setError(`You can select up to ${MAX_IMAGES} images.`)
            return
        }

        const invalid = nextFiles.find((file) => !IMAGE_TYPES.has(file.type))
        if (invalid) {
            setError(`Unsupported image type: ${invalid.name}`)
            return
        }

        setImages(nextFiles)
    }

    const onVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextFiles = Array.from(event.target.files || [])

        setError("")
        setSuccess("")

        if (nextFiles.length > MAX_VIDEOS) {
            setError("You can select only one video.")
            return
        }

        const nextVideo = nextFiles[0] || null
        if (nextVideo && !VIDEO_TYPES.has(nextVideo.type)) {
            setError(`Unsupported video type: ${nextVideo.name}`)
            return
        }

        setVideo(nextVideo)
    }

    const submit = async () => {
        setError("")
        setSuccess("")

        const files = [...images, ...(video ? [video] : [])]
        if (!files.length) {
            setError("Select at least one image or video.")
            return
        }

        if (images.length > MAX_IMAGES) {
            setError(`You can upload up to ${MAX_IMAGES} images.`)
            return
        }

        setSubmitting(true)
        setProgress(0)

        try {
            const submitViaServerFallback = async () => {
                const formData = new FormData()
                for (const file of files) {
                    formData.append("files", file)
                }

                const response = await fetch(`/api/site-media/sites/${siteId}/media-upload-fallback`, {
                    method: "POST",
                    body: formData,
                })

                if (!response.ok) {
                    throw new Error(await response.text())
                }
            }

            const presignResponse = await fetch(`/api/site-media/sites/${siteId}/media-presign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    files: files.map((file) => ({
                        fileName: file.name,
                        mimeType: file.type,
                        size: file.size,
                    })),
                }),
            })

            if (!presignResponse.ok) {
                throw new Error(await presignResponse.text())
            }

            const presignData = (await presignResponse.json()) as { uploads: UploadPayload[] }
            if (!Array.isArray(presignData.uploads) || presignData.uploads.length !== files.length) {
                throw new Error("Upload configuration mismatch")
            }

            let directUploadFailed = false
            for (let index = 0; index < files.length; index += 1) {
                try {
                    const file = files[index]
                    const upload = presignData.uploads[index]

                    const putResponse = await fetch(upload.uploadUrl, {
                        method: "PUT",
                        headers: {
                            "Content-Type": file.type,
                        },
                        body: file,
                    })

                    if (!putResponse.ok) {
                        throw new Error(`Failed to upload ${file.name}`)
                    }

                    setProgress(Math.round(((index + 1) / files.length) * 100))
                } catch (uploadError) {
                    const message = uploadError instanceof Error ? uploadError.message : "Failed to upload"
                    const isNetworkLike = uploadError instanceof TypeError || /failed to fetch/i.test(message)
                    if (isNetworkLike) {
                        directUploadFailed = true
                        break
                    }
                    throw uploadError
                }
            }

            if (directUploadFailed) {
                setProgress(35)
                await submitViaServerFallback()
                setProgress(100)
            } else {
                const submitResponse = await fetch(`/api/site-media/sites/${siteId}/media-submit`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        uploadedMedia: presignData.uploads.map((upload) => ({
                            key: upload.key,
                            fileName: upload.fileName,
                            mimeType: upload.mimeType,
                            size: upload.size,
                        })),
                    }),
                })

                if (!submitResponse.ok) {
                    throw new Error(await submitResponse.text())
                }
            }

            setImages([])
            setVideo(null)
            setSuccess("Site media updated successfully.")
            await refreshSite()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to upload media")
        } finally {
            setSubmitting(false)
        }
    }

    const activeImages = site.media.images
    const activeVideo = site.media.videos[0] || null

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Upload Site Media</h1>
                    <p className="text-sm text-gray-600">Upload up to 5 images and 1 video for this public site.</p>
                </div>
                <Link
                    href="/dashboard/site-media/sites"
                    className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back to Sites
                </Link>
            </div>

            {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {success && <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Site ID / Code</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{site.siteCode || "-"}</p>
                    <p className="mt-3 text-xs uppercase tracking-wide text-gray-500">Petrol Pump / Site</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{site.outletName || "-"}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Location</p>
                    <p className="mt-1 text-sm text-gray-900">
                        {[site.locationName, site.city || site.district, site.state].filter(Boolean).join(", ")}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-wide text-gray-500">360 View Link</p>
                    {site.view360Url ? (
                        <a href={site.view360Url} target="_blank" rel="noreferrer" className="mt-1 block text-sm text-blue-600 hover:text-blue-800">
                            {site.view360Url}
                        </a>
                    ) : (
                        <p className="mt-1 text-sm text-gray-500">Not available</p>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                    <h2 className="text-sm font-semibold text-gray-900">Current Active Images ({activeImages.length}/5)</h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {activeImages.map((media) => (
                            <div key={media.id} className="relative aspect-square overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                                {media.url ? (
                                    <Image src={media.url} alt={media.fileName} fill className="object-cover" sizes="200px" />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-xs text-gray-400">No preview</div>
                                )}
                            </div>
                        ))}
                        {activeImages.length === 0 && (
                            <div className="col-span-full rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-xs text-gray-500">
                                No active images.
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                    <h2 className="text-sm font-semibold text-gray-900">Current Active Video ({activeVideo ? 1 : 0}/1)</h2>
                    {activeVideo?.url ? (
                        <video controls className="w-full rounded-md border border-gray-200" src={activeVideo.url} />
                    ) : (
                        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-xs text-gray-500">
                            No active video.
                        </div>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">Upload Images</h3>
                        <p className="text-xs text-gray-500">Allowed: JPEG, PNG, WEBP. Max 5 files.</p>
                    </div>
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={onImagesChange}
                        className="block w-full text-sm"
                    />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {imagePreviews.map((preview) => (
                            <div key={preview.url} className="relative aspect-square overflow-hidden rounded-md border border-gray-200">
                                <Image src={preview.url} alt={preview.file.name} fill className="object-cover" sizes="200px" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">Upload Video</h3>
                        <p className="text-xs text-gray-500">Allowed: MP4, MOV, WEBM. Max 1 file.</p>
                    </div>
                    <input
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm"
                        onChange={onVideoChange}
                        className="block w-full text-sm"
                    />
                    {videoPreview && (
                        <video controls className="w-full rounded-md border border-gray-200" src={videoPreview} />
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-600">
                        This submission will replace the currently active media of the same type (images and/or video) for this site.
                    </p>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={submitting}
                        className="inline-flex items-center justify-center rounded-md bg-[#002147] px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Submit Media
                    </button>
                </div>
                {submitting && (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full bg-[#002147] transition-all" style={{ width: `${progress}%` }} />
                    </div>
                )}
            </div>
        </div>
    )
}
