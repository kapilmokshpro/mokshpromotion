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
const VENDOR_MEDIA_STORAGE = (process.env.VENDOR_MEDIA_STORAGE || "local").trim().toLowerCase()

type S3StorageConfig = {
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

const parseBooleanEnv = (value: string | undefined, fallback = false) => {
    const normalized = (value || "").trim().toLowerCase()
    if (!normalized) return fallback
    return ["1", "true", "yes", "on"].includes(normalized)
}

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, "")

const resolveS3StorageConfig = (): S3StorageConfig | null => {
    if (s3StorageConfigLoaded) return s3StorageConfigCache
    s3StorageConfigLoaded = true

    if (VENDOR_MEDIA_STORAGE !== "s3") {
        s3StorageConfigCache = null
        return null
    }

    const bucket = trimEnv(process.env.VENDOR_MEDIA_S3_BUCKET)
    const regionRaw = trimEnv(process.env.VENDOR_MEDIA_S3_REGION)
    const endpointRaw = trimEnv(process.env.VENDOR_MEDIA_S3_ENDPOINT)
    const accessKeyId = trimEnv(process.env.VENDOR_MEDIA_S3_ACCESS_KEY_ID)
    const secretAccessKey = trimEnv(process.env.VENDOR_MEDIA_S3_SECRET_ACCESS_KEY)
    const publicBaseUrlRaw = trimEnv(process.env.VENDOR_MEDIA_PUBLIC_BASE_URL)

    if (!bucket) {
        throw new Error("Missing VENDOR_MEDIA_S3_BUCKET for vendor media storage")
    }
    if (!accessKeyId || !secretAccessKey) {
        throw new Error("Missing VENDOR_MEDIA_S3_ACCESS_KEY_ID or VENDOR_MEDIA_S3_SECRET_ACCESS_KEY")
    }

    const region = regionRaw || (endpointRaw.includes("r2.cloudflarestorage.com") ? "auto" : "us-east-1")
    const endpoint = endpointRaw ? stripTrailingSlashes(endpointRaw) : undefined
    const forcePathStyle = parseBooleanEnv(
        process.env.VENDOR_MEDIA_S3_FORCE_PATH_STYLE,
        !!endpoint
    )

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

const getS3Client = (config: S3StorageConfig) => {
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

const buildStoredFileName = (sourceName: string) => {
    const extension = path.extname(sourceName) || ""
    const baseName = path.basename(sourceName, extension)
    const safeBase = sanitizeFileName(baseName).slice(0, 60) || "proof"
    const uniquePart = crypto.randomBytes(6).toString("hex")

    return `${Date.now()}-${uniquePart}-${safeBase}${extension}`
}

const buildCloudPublicUrl = (config: S3StorageConfig, key: string) => {
    if (config.publicBaseUrl) {
        return `${config.publicBaseUrl}/${key}`
    }

    if (config.endpoint) {
        return `${config.endpoint}/${config.bucket}/${key}`
    }

    return `https://s3.${config.region}.amazonaws.com/${config.bucket}/${key}`
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
        const mimeType = (file.type || "").toLowerCase()
        const extension = path.extname(file.name || "").toLowerCase()
        totalBytes += file.size

        const isImage = IMAGE_MIME_TYPES.has(mimeType) || (!mimeType && IMAGE_EXTENSIONS.has(extension))
        const isVideo = VIDEO_MIME_TYPES.has(mimeType) || (!mimeType && VIDEO_EXTENSIONS.has(extension))

        if (isImage) {
            photoCount += 1
            parsed.push({ file, mediaType: VendorProofMediaType.PHOTO })
            continue
        }

        if (isVideo) {
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
        const s3Client = getS3Client(s3Config)
        const storedCloud: StoredVendorProofMedia[] = []

        for (const item of params.files) {
            const sourceName = item.file.name || "file"
            const finalName = buildStoredFileName(sourceName)
            const key = path.posix.join(
                "vendor-proofs",
                String(params.vendorId),
                params.assignmentId,
                finalName
            )
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
                url: buildCloudPublicUrl(s3Config, key),
                fileName: finalName,
                mimeType: item.file.type,
                size: item.file.size,
            })
        }

        return storedCloud
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
        const finalName = buildStoredFileName(sourceName)
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
