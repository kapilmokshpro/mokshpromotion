import { mkdir, writeFile } from "fs/promises"
import path from "path"
import crypto from "crypto"
import { VendorProofMediaType } from "@prisma/client"

export const MAX_VENDOR_PROOF_PHOTOS = 5
export const MAX_VENDOR_PROOF_VIDEOS = 2

const IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
])

const VIDEO_MIME_TYPES = new Set([
    "video/mp4",
    "video/quicktime",
    "video/webm",
])

const PUBLIC_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "vendor-proofs")

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

export function parseAndValidateProofFiles(files: File[]) {
    if (!files?.length) {
        throw new Error("At least one media file is required")
    }

    const parsed: ParsedProofFile[] = []
    let photoCount = 0
    let videoCount = 0

    for (const file of files) {
        const mimeType = (file.type || "").toLowerCase()

        if (IMAGE_MIME_TYPES.has(mimeType)) {
            photoCount += 1
            parsed.push({ file, mediaType: VendorProofMediaType.PHOTO })
            continue
        }

        if (VIDEO_MIME_TYPES.has(mimeType)) {
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

    return parsed
}

export async function storeVendorProofFiles(params: {
    vendorId: number
    assignmentId: string
    files: ParsedProofFile[]
}) {
    const folderPath = path.join(
        PUBLIC_UPLOAD_ROOT,
        String(params.vendorId),
        params.assignmentId
    )
    await mkdir(folderPath, { recursive: true })

    const stored: StoredVendorProofMedia[] = []

    for (const item of params.files) {
        const sourceName = item.file.name || "file"
        const extension = path.extname(sourceName) || ""
        const baseName = path.basename(sourceName, extension)
        const safeBase = sanitizeFileName(baseName).slice(0, 60) || "proof"
        const uniquePart = crypto.randomBytes(6).toString("hex")
        const finalName = `${Date.now()}-${uniquePart}-${safeBase}${extension}`
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

