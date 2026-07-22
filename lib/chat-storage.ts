import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import crypto from "crypto"

export const getS3Client = () => {
    const endpoint = process.env.VENDOR_MEDIA_S3_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    const accessKeyId = process.env.VENDOR_MEDIA_S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || ""
    const secretAccessKey = process.env.VENDOR_MEDIA_S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || ""
    const region = process.env.VENDOR_MEDIA_S3_REGION || "auto"

    return new S3Client({
        region,
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: process.env.VENDOR_MEDIA_S3_FORCE_PATH_STYLE === "true",
    })
}

export const getBucket = () => process.env.VENDOR_MEDIA_S3_BUCKET || process.env.R2_BUCKET_NAME || "mokshpromotion"

const getPublicBaseUrl = () => {
    const url = process.env.VENDOR_MEDIA_PUBLIC_BASE_URL || process.env.R2_PUBLIC_URL || ""
    if (url.includes("REPLACE-WITH-YOUR") || !url.startsWith("http")) {
        return ""
    }
    return url
}

const VOICE_PREFIX = "chat-voice"
const MAX_VOICE_SIZE = 5 * 1024 * 1024 // 5MB

const ALLOWED_AUDIO_TYPES = new Set([
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav",
    "audio/x-m4a",
])

export type VoiceUploadResult = {
    key: string
    url: string
}

/**
 * Upload a voice note buffer to R2/S3
 */
export async function uploadVoiceNote(
    channelId: string,
    audioBuffer: Buffer,
    mimeType: string,
    fileName?: string
): Promise<VoiceUploadResult> {
    if (audioBuffer.length > MAX_VOICE_SIZE) {
        throw new Error(`Voice note too large: ${audioBuffer.length} bytes (max ${MAX_VOICE_SIZE})`)
    }

    if (!ALLOWED_AUDIO_TYPES.has(mimeType)) {
        throw new Error(`Unsupported audio type: ${mimeType}`)
    }

    const ext = getExtension(mimeType)
    const uniqueId = crypto.randomUUID()
    const key = `${VOICE_PREFIX}/${channelId}/${uniqueId}${ext}`

    const client = getS3Client()
    const bucket = getBucket()

    await client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: audioBuffer,
            ContentType: mimeType,
            CacheControl: "public, max-age=31536000, immutable",
        })
    )

    const publicBase = getPublicBaseUrl()
    const url = publicBase
        ? `${publicBase.replace(/\/$/, "")}/${key}`
        : `/api/chat/voice-file?key=${encodeURIComponent(key)}`

    return { key, url }
}

/**
 * Delete a voice note from R2/S3
 */
export async function deleteVoiceNote(key: string): Promise<void> {
    const client = getS3Client()
    const bucket = getBucket()

    await client.send(
        new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
        })
    )
}

function getExtension(mimeType: string): string {
    switch (mimeType) {
        case "audio/webm": return ".webm"
        case "audio/ogg": return ".ogg"
        case "audio/mp4": return ".m4a"
        case "audio/mpeg": return ".mp3"
        case "audio/wav": return ".wav"
        case "audio/x-m4a": return ".m4a"
        default: return ".webm"
    }
}
