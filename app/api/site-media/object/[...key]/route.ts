import { GetObjectCommand, NoSuchKey } from "@aws-sdk/client-s3"
import { NextResponse } from "next/server"
import { Readable } from "node:stream"
import { getSiteMediaS3Client, getSiteMediaStorageConfig } from "@/lib/site-media-storage"

export const runtime = "nodejs"

const asWebStream = (body: unknown): ReadableStream<Uint8Array> | null => {
    if (!body) return null

    const maybeBody = body as {
        transformToWebStream?: () => ReadableStream<Uint8Array>
    }

    if (typeof maybeBody.transformToWebStream === "function") {
        return maybeBody.transformToWebStream()
    }

    if (body instanceof Readable) {
        return Readable.toWeb(body) as ReadableStream<Uint8Array>
    }

    return null
}

const sanitizeJoinedKey = (parts: string[]) => {
    const joined = parts.join("/").replace(/^\/+|\/+$/g, "")
    if (!joined) return ""
    if (joined.includes("..")) return ""
    return joined
}

export async function GET(
    req: Request,
    { params }: { params: { key: string[] } }
) {
    try {
        const rawParts = Array.isArray(params.key) ? params.key : []
        const decodedParts = rawParts.map((part) => decodeURIComponent(part || "").trim()).filter(Boolean)
        const key = sanitizeJoinedKey(decodedParts)

        if (!key) {
            return new NextResponse("Invalid object key", { status: 400 })
        }

        const config = getSiteMediaStorageConfig()
        if (!config) {
            return new NextResponse("Media storage is not configured", { status: 500 })
        }

        const s3Client = getSiteMediaS3Client()
        const range = req.headers.get("range") || undefined

        const object = await s3Client.send(
            new GetObjectCommand({
                Bucket: config.bucket,
                Key: key,
                Range: range,
            })
        )

        const stream = asWebStream(object.Body)
        if (!stream) {
            return new NextResponse("Media stream is unavailable", { status: 500 })
        }

        const headers = new Headers()
        headers.set("Cache-Control", "public, max-age=31536000, immutable")

        if (object.ContentType) headers.set("Content-Type", object.ContentType)
        if (object.ContentLength !== undefined && object.ContentLength !== null) {
            headers.set("Content-Length", String(object.ContentLength))
        }
        if (object.ETag) headers.set("ETag", object.ETag)
        if (object.LastModified) headers.set("Last-Modified", object.LastModified.toUTCString())
        if (object.AcceptRanges) headers.set("Accept-Ranges", object.AcceptRanges)
        if (object.ContentRange) headers.set("Content-Range", object.ContentRange)

        const status = object.ContentRange ? 206 : 200
        return new NextResponse(stream, { status, headers })
    } catch (error) {
        if (error instanceof NoSuchKey) {
            return new NextResponse("Media not found", { status: 404 })
        }

        const code =
            typeof error === "object" &&
            error !== null &&
            "name" in error &&
            typeof (error as { name?: unknown }).name === "string"
                ? String((error as { name: string }).name)
                : ""

        if (code === "NoSuchKey") {
            return new NextResponse("Media not found", { status: 404 })
        }

        console.error("SITE_MEDIA_OBJECT_GET", error)
        return new NextResponse("Failed to load media", { status: 500 })
    }
}
