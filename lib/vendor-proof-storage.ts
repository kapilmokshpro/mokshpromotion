import { mkdir, writeFile } from "fs/promises"
import path from "path"
import crypto from "crypto"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { VendorProofMediaType } from "@prisma/client"

export const MAX_VENDOR_PROOF_PHOTOS = 5
export const MAX_VENDOR_PROOF_VIDEOS = 2
export const MAX_VENDOR_PROOF_TOTAL_BYTES = 4 * 1024 * 1024
export const MAX_VENDOR_PROOF_VIDEO_BYTES = 3 * 1024 * 1024

const IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
])

const VIDEO_MIME_TYPES = new Set([
    "video/mp4",
    "video/quicktime",
    "video/webm",
])

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"])
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm"])

const PUBLIC_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "vendor-proofs")

export type S3StorageConfig = {
    bucket: string
    region: string
    endpoint?: string
    accessKeyId: string
    secretAccessKey: string
    forcePathStyle: boolean
    publicBaseUrl?: string
}

type ParsedProofFile = {
    file: File
    mediaType: VendorProofMediaType
}

export type VendorProofUploadCandidate = {
    fileName: string
    mimeType: string
    size: number
}

export type StoredVendorProofMedia = {
    type: VendorProofMediaType
    url: string
    fileName: string
    mimeType: string
    size: number
}

const sanitizeFileName = (name: string) =>
    name.replace(/[^a-zA-Z0-9._-]/g, "_")

let s3ClientCache: S3Client | null = null
let s3StorageConfigCache: S3StorageConfig | null = null
let s3StorageConfigLoaded = false

const trimEnv = (value?: string | null) => (value || "").trim()
const pickEnv = (...keys: string[]) => {
    for (const key of keys) {
        const value = trimEnv(process.env[key])
        if (value) return value
    }
    return ""
}

const parseBooleanEnv = (value: string | undefined, fallback = false) => {
    const normalized = (value || "").trim().toLowerCase()
    if (!normalized) return fallback
    return ["1", "true", "yes", "on"].includes(normalized)
}

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, "")
const stripEdgeSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "")

const resolveVendorMediaStorageMode = () => {
    const normalized = (process.env.VENDOR_MEDIA_STORAGE || "local").trim().toLowerCase()
    if (!normalized || normalized === "local") return "local"
    if (normalized === "s3" || normalized === "r2") return "s3"
    return "local"
}

export const getVendorMediaStorageMode = () => resolveVendorMediaStorageMode()

export const resolveS3StorageConfig = (): S3StorageConfig | null => {
    if (s3StorageConfigLoaded) return s3StorageConfigCache
    s3StorageConfigLoaded = true

    if (resolveVendorMediaStorageMode() !== "s3") {
        s3StorageConfigCache = null
        return null
    }

    const bucket = pickEnv("VENDOR_MEDIA_S3_BUCKET", "VENDOR_MEDIA_R2_BUCKET", "R2_BUCKET_NAME")
    const regionRaw = pickEnv("VENDOR_MEDIA_S3_REGION", "VENDOR_MEDIA_R2_REGION", "R2_REGION")
    const accountId = pickEnv("R2_ACCOUNT_ID", "VENDOR_MEDIA_R2_ACCOUNT_ID")
    const endpointRaw = pickEnv("VENDOR_MEDIA_S3_ENDPOINT", "VENDOR_MEDIA_R2_ENDPOINT", "R2_ENDPOINT")
    const resolvedEndpointRaw = endpointRaw || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "")
    const accessKeyId = pickEnv("VENDOR_MEDIA_S3_ACCESS_KEY_ID", "VENDOR_MEDIA_R2_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID")
    const secretAccessKey = pickEnv("VENDOR_MEDIA_S3_SECRET_ACCESS_KEY", "VENDOR_MEDIA_R2_SECRET_ACCESS_KEY", "R2_SECRET_ACCESS_KEY")
    const publicBaseUrlRaw = pickEnv(
        "VENDOR_MEDIA_PUBLIC_BASE_URL",
        "VENDOR_MEDIA_S3_PUBLIC_BASE_URL",
        "VENDOR_MEDIA_R2_PUBLIC_BASE_URL",
        "R2_PUBLIC_URL"
    )

    if (!bucket) {
        throw new Error("Missing vendor media bucket env (VENDOR_MEDIA_S3_BUCKET or VENDOR_MEDIA_R2_BUCKET)")
    }
    if (!accessKeyId || !secretAccessKey) {
        throw new Error("Missing vendor media access keys (S3/R2 access key id or secret)")
    }

    const region = regionRaw || (resolvedEndpointRaw.includes("r2.cloudflarestorage.com") ? "auto" : "us-east-1")
    const endpoint = resolvedEndpointRaw ? stripTrailingSlashes(resolvedEndpointRaw) : undefined
    const forcePathStyleValue = pickEnv("VENDOR_MEDIA_S3_FORCE_PATH_STYLE", "VENDOR_MEDIA_R2_FORCE_PATH_STYLE", "R2_FORCE_PATH_STYLE")
    const forcePathStyle = parseBooleanEnv(
        forcePathStyleValue,
        !!endpoint
    )

    if (endpoint?.includes("r2.cloudflarestorage.com") && !publicBaseUrlRaw) {
        throw new Error(
            "Missing VENDOR_MEDIA_PUBLIC_BASE_URL for R2 media rendering. Use your public R2 domain (custom domain or r2.dev URL)."
        )
    }
    if (publicBaseUrlRaw.includes("r2.cloudflarestorage.com")) {
        throw new Error(
            "R2 public URL is invalid for browser rendering. Use a public custom domain or an r2.dev URL in VENDOR_MEDIA_PUBLIC_BASE_URL."
        )
    }

    s3StorageConfigCache = {
        bucket,
        region,
        endpoint,
        accessKeyId,
        secretAccessKey,
        forcePathStyle,
        publicBaseUrl: publicBaseUrlRaw ? stripTrailingSlashes(publicBaseUrlRaw) : undefined,
    }

    return s3StorageConfigCache
}

export const getVendorProofS3Client = (config: S3StorageConfig) => {
    if (s3ClientCache) return s3ClientCache

    s3ClientCache = new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        forcePathStyle: config.forcePathStyle,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
    })

    return s3ClientCache
}

export const buildVendorProofStoredFileName = (sourceName: string) => {
    const extension = path.extname(sourceName) || ""
    const baseName = path.basename(sourceName, extension)
    const safeBase = sanitizeFileName(baseName).slice(0, 60) || "proof"
    const uniquePart = crypto.randomBytes(6).toString("hex")

    return `${Date.now()}-${uniquePart}-${safeBase}${extension}`
}

export const getVendorProofObjectPrefix = () => {
    return stripEdgeSlashes(
        pickEnv(
            "VENDOR_MEDIA_OBJECT_PREFIX",
            "VENDOR_MEDIA_S3_OBJECT_PREFIX",
            "VENDOR_MEDIA_R2_OBJECT_PREFIX",
            "R2_UPLOAD_PREFIX"
        ) || "vendor-proofs"
    )
}

export const buildVendorProofObjectKey = (params: {
    vendorId: number
    assignmentId: string
    finalName: string
}) => {
    const objectPrefix = getVendorProofObjectPrefix()

    return path.posix.join(
        objectPrefix,
        String(params.vendorId),
        params.assignmentId,
        params.finalName
    )
}

export const buildVendorProofCloudPublicUrl = (config: S3StorageConfig, key: string) => {
    if (config.publicBaseUrl) {
        return `${config.publicBaseUrl}/${key}`
    }

    if (config.endpoint) {
        return `${config.endpoint}/${config.bucket}/${key}`
    }

    return `https://s3.${config.region}.amazonaws.com/${config.bucket}/${key}`
}

const resolveMediaType = (fileName: string, mimeType: string) => {
    const normalizedMimeType = (mimeType || "").toLowerCase()
    const extension = path.extname(fileName || "").toLowerCase()

    const isImage = IMAGE_MIME_TYPES.has(normalizedMimeType) || (!normalizedMimeType && IMAGE_EXTENSIONS.has(extension))
    const isVideo = VIDEO_MIME_TYPES.has(normalizedMimeType) || (!normalizedMimeType && VIDEO_EXTENSIONS.has(extension))

    if (isImage) return VendorProofMediaType.PHOTO
    if (isVideo) return VendorProofMediaType.VIDEO
    return null
}

export function parseAndValidateProofUploadCandidates(candidates: VendorProofUploadCandidate[]) {
    if (!candidates?.length) {
        throw new Error("At least one media file is required")
    }

    const parsed: Array<{ mediaType: VendorProofMediaType } & VendorProofUploadCandidate> = []
    let photoCount = 0
    let videoCount = 0
    let totalBytes = 0

    for (const candidate of candidates) {
        const fileName = (candidate.fileName || "").trim()
        const mimeType = (candidate.mimeType || "").trim()
        const size = Number(candidate.size)

        if (!fileName) throw new Error("Invalid file name")
        if (!Number.isFinite(size) || size <= 0) throw new Error(`Invalid file size for ${fileName}`)

        totalBytes += size

        const mediaType = resolveMediaType(fileName, mimeType)
        if (!mediaType) {
            throw new Error(`Unsupported file type: ${fileName}`)
        }

        if (mediaType === VendorProofMediaType.PHOTO) {
            photoCount += 1
        } else {
            if (size > MAX_VENDOR_PROOF_VIDEO_BYTES) {
                throw new Error(`Video "${fileName}" exceeds allowed size limit`)
            }
            videoCount += 1
        }

        parsed.push({
            mediaType,
            fileName,
            mimeType,
            size,
        })
    }

    if (photoCount > MAX_VENDOR_PROOF_PHOTOS) {
        throw new Error(`You can upload up to ${MAX_VENDOR_PROOF_PHOTOS} photos`)
    }

    if (videoCount > MAX_VENDOR_PROOF_VIDEOS) {
        throw new Error(`You can upload up to ${MAX_VENDOR_PROOF_VIDEOS} videos`)
    }

    if (totalBytes > MAX_VENDOR_PROOF_TOTAL_BYTES) {
        throw new Error("Combined file size exceeds allowed limit")
    }

    return parsed
}

export function parseAndValidateProofFiles(files: File[]) {
    if (!files?.length) {
        throw new Error("At least one media file is required")
    }

    const parsed: ParsedProofFile[] = []
    let photoCount = 0
    let videoCount = 0
    let totalBytes = 0

    for (const file of files) {
        totalBytes += file.size
        const mediaType = resolveMediaType(file.name || "", file.type || "")

        if (mediaType === VendorProofMediaType.PHOTO) {
            photoCount += 1
            parsed.push({ file, mediaType: VendorProofMediaType.PHOTO })
            continue
        }
        if (mediaType === VendorProofMediaType.VIDEO) {
            if (file.size > MAX_VENDOR_PROOF_VIDEO_BYTES) {
                throw new Error(`Video "${file.name}" exceeds allowed size limit`)
            }
            videoCount += 1
            parsed.push({ file, mediaType: VendorProofMediaType.VIDEO })
            continue
        }

        throw new Error(`Unsupported file type: ${file.name}`)
    }

    if (photoCount > MAX_VENDOR_PROOF_PHOTOS) {
        throw new Error(`You can upload up to ${MAX_VENDOR_PROOF_PHOTOS} photos`)
    }

    if (videoCount > MAX_VENDOR_PROOF_VIDEOS) {
        throw new Error(`You can upload up to ${MAX_VENDOR_PROOF_VIDEOS} videos`)
    }

    if (totalBytes > MAX_VENDOR_PROOF_TOTAL_BYTES) {
        throw new Error("Combined file size exceeds allowed limit")
    }

    return parsed
}

export async function storeVendorProofFiles(params: {
    vendorId: number
    assignmentId: string
    files: ParsedProofFile[]
}) {
    const s3Config = resolveS3StorageConfig()
    if (s3Config) {
        const s3Client = getVendorProofS3Client(s3Config)
        const storedCloud: StoredVendorProofMedia[] = []

        for (const item of params.files) {
            const sourceName = item.file.name || "file"
            const finalName = buildVendorProofStoredFileName(sourceName)
            const key = buildVendorProofObjectKey({
                vendorId: params.vendorId,
                assignmentId: params.assignmentId,
                finalName,
            })
            const buffer = Buffer.from(await item.file.arrayBuffer())

            await s3Client.send(
                new PutObjectCommand({
                    Bucket: s3Config.bucket,
                    Key: key,
                    Body: buffer,
                    ContentType: item.file.type || undefined,
                })
            )

            storedCloud.push({
                type: item.mediaType,
                url: buildVendorProofCloudPublicUrl(s3Config, key),
                fileName: finalName,
                mimeType: item.file.type,
                size: item.file.size,
            })
        }

        return storedCloud
    }

    if (process.env.VERCEL === "1") {
        throw new Error(
            "Local vendor media storage is not supported on Vercel. Set VENDOR_MEDIA_STORAGE=s3 (or r2) and configure R2/S3 env variables."
        )
    }

    const folderPath = path.join(
        PUBLIC_UPLOAD_ROOT,
        String(params.vendorId),
        params.assignmentId
    )
    await mkdir(folderPath, { recursive: true })

    const stored: StoredVendorProofMedia[] = []

    for (const item of params.files) {
        const sourceName = item.file.name || "file"
        const finalName = buildVendorProofStoredFileName(sourceName)
        const diskPath = path.join(folderPath, finalName)
        const buffer = Buffer.from(await item.file.arrayBuffer())

        await writeFile(diskPath, buffer)

        stored.push({
            type: item.mediaType,
            url: `/uploads/vendor-proofs/${params.vendorId}/${params.assignmentId}/${finalName}`,
            fileName: finalName,
            mimeType: item.file.type,
            size: item.file.size,
        })
    }

    return stored
}
