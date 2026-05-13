import crypto from "crypto"
import path from "path"
import { InventorySiteMediaType } from "@prisma/client"
import {
    buildVendorProofCloudPublicUrl,
    getVendorProofS3Client,
    resolveS3StorageConfig,
} from "@/lib/vendor-proof-storage"

export const MAX_SITE_MEDIA_IMAGES = 5
export const MAX_SITE_MEDIA_VIDEOS = 1
export const MAX_SITE_MEDIA_IMAGE_BYTES = 15 * 1024 * 1024
export const MAX_SITE_MEDIA_VIDEO_BYTES = 50 * 1024 * 1024
export const MAX_SITE_MEDIA_TOTAL_BYTES = 125 * 1024 * 1024

const SITE_MEDIA_IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
])

const SITE_MEDIA_VIDEO_MIME_TYPES = new Set([
    "video/mp4",
    "video/quicktime",
    "video/webm",
])

const MIME_EXTENSION_MAP: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
}

export type SiteMediaUploadCandidate = {
    fileName: string
    mimeType: string
    size: number
}

export type ParsedSiteMediaUploadCandidate = {
    fileName: string
    mimeType: string
    size: number
    type: InventorySiteMediaType
    extension: string
}

export type ParsedSiteMediaFile = ParsedSiteMediaUploadCandidate & {
    file: File
}

const getExtensionFromFileName = (fileName: string) => {
    const ext = path.extname(fileName || "").replace(".", "").toLowerCase()
    return ext || ""
}

const pickObjectPrefix = () => {
    const fromSiteMedia = (process.env.SITE_MEDIA_OBJECT_PREFIX || "").trim()
    if (fromSiteMedia) return fromSiteMedia.replace(/^\/+|\/+$/g, "")

    const fromVendorMedia = (process.env.VENDOR_MEDIA_OBJECT_PREFIX || "").trim()
    if (fromVendorMedia) return fromVendorMedia.replace(/^\/+|\/+$/g, "")

    const fromGeneric = (process.env.R2_UPLOAD_PREFIX || "").trim()
    if (fromGeneric) return fromGeneric.replace(/^\/+|\/+$/g, "")

    return "site-media"
}

export const getSiteMediaObjectPrefix = pickObjectPrefix

const parseMediaType = (mimeType: string): InventorySiteMediaType | null => {
    if (SITE_MEDIA_IMAGE_MIME_TYPES.has(mimeType)) return InventorySiteMediaType.IMAGE
    if (SITE_MEDIA_VIDEO_MIME_TYPES.has(mimeType)) return InventorySiteMediaType.VIDEO
    return null
}

export function parseAndValidateSiteMediaUploadCandidates(
    candidates: SiteMediaUploadCandidate[]
): ParsedSiteMediaUploadCandidate[] {
    if (!Array.isArray(candidates)) {
        throw new Error("Invalid media payload")
    }

    let imageCount = 0
    let videoCount = 0
    let totalBytes = 0

    const parsed: ParsedSiteMediaUploadCandidate[] = []

    for (const candidate of candidates) {
        const fileName = (candidate.fileName || "").trim()
        const mimeType = (candidate.mimeType || "").trim().toLowerCase()
        const size = Number(candidate.size)

        if (!fileName) {
            throw new Error("File name is required")
        }
        if (!Number.isFinite(size) || size <= 0) {
            throw new Error(`Invalid file size for ${fileName}`)
        }

        const type = parseMediaType(mimeType)
        if (!type) {
            throw new Error(`Unsupported file type: ${fileName}`)
        }

        const extension = getExtensionFromFileName(fileName) || MIME_EXTENSION_MAP[mimeType] || "bin"

        if (type === InventorySiteMediaType.IMAGE) {
            imageCount += 1
            if (size > MAX_SITE_MEDIA_IMAGE_BYTES) {
                throw new Error(`Image \"${fileName}\" exceeds the size limit`)
            }
        } else {
            videoCount += 1
            if (size > MAX_SITE_MEDIA_VIDEO_BYTES) {
                throw new Error(`Video \"${fileName}\" exceeds the size limit`)
            }
        }

        totalBytes += size

        parsed.push({
            fileName,
            mimeType,
            size,
            type,
            extension,
        })
    }

    if (imageCount > MAX_SITE_MEDIA_IMAGES) {
        throw new Error(`You can upload up to ${MAX_SITE_MEDIA_IMAGES} images`)
    }
    if (videoCount > MAX_SITE_MEDIA_VIDEOS) {
        throw new Error(`You can upload up to ${MAX_SITE_MEDIA_VIDEOS} video`)
    }
    if (totalBytes > MAX_SITE_MEDIA_TOTAL_BYTES) {
        throw new Error("Combined file size exceeds allowed limit")
    }

    return parsed
}

export function parseAndValidateSiteMediaFiles(files: File[]): ParsedSiteMediaFile[] {
    const parsedCandidates = parseAndValidateSiteMediaUploadCandidates(
        files.map((file) => ({
            fileName: file.name || "",
            mimeType: file.type || "",
            size: file.size,
        }))
    )

    return parsedCandidates.map((parsed, index) => ({
        ...parsed,
        file: files[index],
    }))
}

export const buildSiteMediaObjectKey = (params: {
    inventoryHoardingId: number
    extension: string
}) => {
    const safeExtension = (params.extension || "bin").replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin"
    const uniquePart = crypto.randomBytes(8).toString("hex")
    const fileName = `${Date.now()}-${uniquePart}.${safeExtension}`
    return path.posix.join(getSiteMediaObjectPrefix(), String(params.inventoryHoardingId), fileName)
}

export const getSiteMediaStorageConfig = () => resolveS3StorageConfig()

export const getSiteMediaS3Client = () => {
    const config = getSiteMediaStorageConfig()
    if (!config) {
        throw new Error("R2/S3 configuration missing for site media")
    }
    return getVendorProofS3Client(config)
}

export const buildSiteMediaPublicUrl = (key: string) => {
    const config = getSiteMediaStorageConfig()
    if (!config) return null
    return buildVendorProofCloudPublicUrl(config, key)
}

export const extractSiteMediaKeyFromUrl = (url: string) => {
    const input = (url || "").trim()
    if (!input) return ""

    const config = getSiteMediaStorageConfig()
    if (!config) {
        try {
            const parsed = new URL(input)
            return parsed.pathname.replace(/^\/+/, "")
        } catch {
            return ""
        }
    }

    const publicBaseUrl = config?.publicBaseUrl?.replace(/\/+$/, "")
    if (publicBaseUrl && input.startsWith(`${publicBaseUrl}/`)) {
        return input.slice(publicBaseUrl.length + 1)
    }

    const endpoint = config?.endpoint?.replace(/\/+$/, "")
    if (endpoint) {
        const withBucket = `${endpoint}/${config.bucket}/`
        if (input.startsWith(withBucket)) {
            return input.slice(withBucket.length)
        }
    }

    try {
        const parsed = new URL(input)
        const pathname = parsed.pathname.replace(/^\/+/, "")
        if (pathname.startsWith(`${config?.bucket || ""}/`)) {
            return pathname.slice((config?.bucket?.length || 0) + 1)
        }
        return pathname
    } catch {
        return ""
    }
}
