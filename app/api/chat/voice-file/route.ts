import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getS3Client, getBucket } from "@/lib/chat-storage"

// GET /api/chat/voice-file?key=chat-voice/... — Stream voice note audio from R2
export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const key = searchParams.get("key")

    if (!key) {
        return new Response("Missing audio key", { status: 400 })
    }

    try {
        const client = getS3Client()
        const bucket = getBucket()

        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        })

        const response = await client.send(command)

        if (!response.Body) {
            return new Response("Audio file not found", { status: 404 })
        }

        const byteArray = await response.Body.transformToByteArray()

        return new Response(Buffer.from(byteArray), {
            headers: {
                "Content-Type": response.ContentType || "audio/webm",
                "Content-Length": byteArray.length.toString(),
                "Cache-Control": "public, max-age=31536000, immutable",
                "Accept-Ranges": "bytes",
            },
        })
    } catch (error) {
        console.error("[Voice Audio Stream Error]", error)
        return new Response("Failed to load audio file", { status: 404 })
    }
}
