import { PutObjectCommand } from "@aws-sdk/client-s3"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireSiteMediaSession } from "@/lib/site-media-auth"
import { mapSiteMediaForClient } from "@/lib/site-media"
import { persistSubmittedSiteMedia } from "@/lib/site-media-submit"
import {
    buildSiteMediaObjectKey,
    buildSiteMediaPublicUrl,
    getSiteMediaS3Client,
    getSiteMediaStorageConfig,
    parseAndValidateSiteMediaFiles,
} from "@/lib/site-media-storage"

export const runtime = "nodejs"

const parseSiteId = (value: string) => {
    const id = Number(value)
    return Number.isInteger(id) && id > 0 ? id : null
}

export async function POST(
    req: Request,
    { params }: { params: { siteId: string } }
) {
    try {
        const guard = await requireSiteMediaSession()
        if (guard.error) return guard.error
        const session = guard.session
        const userId = Number(session.user.id)

        const siteId = parseSiteId(params.siteId)
        if (!siteId) {
            return new NextResponse("Invalid site id", { status: 400 })
        }

        const site = await db.inventoryHoarding.findUnique({
            where: { id: siteId },
            select: { id: true },
        })

        if (!site) {
            return new NextResponse("Site not found", { status: 404 })
        }

        const config = getSiteMediaStorageConfig()
        if (!config) {
            return new NextResponse("R2/S3 configuration missing for site media", { status: 500 })
        }

        const formData = await req.formData()
        const files = formData
            .getAll("files")
            .filter((entry) => entry instanceof File) as File[]

        if (!files.length) {
            return new NextResponse("No files found", { status: 400 })
        }

        const parsedFiles = parseAndValidateSiteMediaFiles(files)
        const s3Client = getSiteMediaS3Client()

        const uploadedMedia: Array<{
            type: (typeof parsedFiles)[number]["type"]
            key: string
            fileName: string
            mimeType: string
            size: number
            url: string | null
        }> = []

        for (const item of parsedFiles) {
            const key = buildSiteMediaObjectKey({
                inventoryHoardingId: siteId,
                extension: item.extension,
            })

            const body = Buffer.from(await item.file.arrayBuffer())

            await s3Client.send(
                new PutObjectCommand({
                    Bucket: config.bucket,
                    Key: key,
                    Body: body,
                    ContentType: item.mimeType || undefined,
                })
            )

            uploadedMedia.push({
                type: item.type,
                key,
                fileName: item.fileName,
                mimeType: item.mimeType,
                size: item.size,
                url: buildSiteMediaPublicUrl(key),
            })
        }

        const updated = await persistSubmittedSiteMedia({
            siteId,
            userId: Number.isInteger(userId) ? userId : null,
            media: uploadedMedia,
        })

        if (!updated) {
            return new NextResponse("Site not found", { status: 404 })
        }

        const imageMedia = updated.siteMedia
            .filter((media) => media.type === "IMAGE")
            .slice(0, 5)
            .map(mapSiteMediaForClient)
        const videoMedia = updated.siteMedia
            .filter((media) => media.type === "VIDEO")
            .slice(0, 1)
            .map(mapSiteMediaForClient)

        return NextResponse.json({
            success: true,
            media: {
                images: imageMedia,
                videos: videoMedia,
            },
        })
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            ["P2021", "P2022"].includes(error.code)
        ) {
            return new NextResponse("Site Media database migration is pending. Run Prisma migration.", { status: 503 })
        }

        if (error instanceof Error) {
            return new NextResponse(error.message, { status: 400 })
        }

        console.error("SITE_MEDIA_MEDIA_UPLOAD_FALLBACK", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
