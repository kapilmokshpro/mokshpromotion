import { InventorySiteMediaType, Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireSiteMediaSession } from "@/lib/site-media-auth"
import { mapSiteMediaForClient } from "@/lib/site-media"
import { persistSubmittedSiteMedia } from "@/lib/site-media-submit"
import {
    buildSiteMediaPublicUrl,
    getSiteMediaObjectPrefix,
    parseAndValidateSiteMediaUploadCandidates,
} from "@/lib/site-media-storage"

export const runtime = "nodejs"

type UploadedMediaItem = {
    key?: string
    fileName?: string
    mimeType?: string
    size?: number
}

type MediaSubmitInput = {
    uploadedMedia?: UploadedMediaItem[]
}

const parseSiteId = (value: string) => {
    const id = Number(value)
    return Number.isInteger(id) && id > 0 ? id : null
}

const isValidObjectKeyForSite = (siteId: number, key: string) => {
    const prefix = getSiteMediaObjectPrefix()
    const expectedPrefix = `${prefix}/${siteId}/`
    return key.startsWith(expectedPrefix)
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

        const body = (await req.json()) as MediaSubmitInput
        const uploadedMedia = Array.isArray(body.uploadedMedia) ? body.uploadedMedia : []

        const parsed = parseAndValidateSiteMediaUploadCandidates(
            uploadedMedia.map((item) => ({
                fileName: item.fileName || "",
                mimeType: item.mimeType || "",
                size: Number(item.size),
            }))
        )

        if (!parsed.length) {
            return new NextResponse("No uploaded media found", { status: 400 })
        }

        const normalized = parsed.map((item, index) => {
            const raw = uploadedMedia[index]
            const key = (raw?.key || "").trim()

            if (!key || !isValidObjectKeyForSite(siteId, key)) {
                throw new Error(`Invalid uploaded object key for ${item.fileName}`)
            }

            return {
                type: item.type,
                key,
                fileName: item.fileName,
                mimeType: item.mimeType,
                size: item.size,
                url: buildSiteMediaPublicUrl(key),
            }
        })

        const updated = await persistSubmittedSiteMedia({
            siteId,
            userId: Number.isInteger(userId) ? userId : null,
            media: normalized.map((item) => ({
                type: item.type,
                key: item.key,
                fileName: item.fileName,
                mimeType: item.mimeType,
                size: item.size,
                url: item.url,
            })),
        })

        if (!updated) {
            return new NextResponse("Site not found", { status: 404 })
        }

        const imageMedia = updated.siteMedia
            .filter((media) => media.type === InventorySiteMediaType.IMAGE)
            .slice(0, 5)
            .map(mapSiteMediaForClient)
        const videoMedia = updated.siteMedia
            .filter((media) => media.type === InventorySiteMediaType.VIDEO)
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
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return new NextResponse("Failed to save media", { status: 400 })
        }
        if (error instanceof Error) {
            return new NextResponse(error.message, { status: 400 })
        }

        console.error("SITE_MEDIA_MEDIA_SUBMIT", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
