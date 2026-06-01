import { InventorySiteMediaType, Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireSiteMediaSession } from "@/lib/site-media-auth"
import { mapSiteMediaForClient } from "@/lib/site-media"

export const runtime = "nodejs"

const parseSiteId = (value: string) => {
    const id = Number(value)
    return Number.isInteger(id) && id > 0 ? id : null
}

export async function DELETE(
    _req: Request,
    { params }: { params: { siteId: string; mediaId: string } }
) {
    try {
        const guard = await requireSiteMediaSession()
        if (guard.error) return guard.error
        const userId = Number(guard.session.user.id)

        const siteId = parseSiteId(params.siteId)
        const mediaId = (params.mediaId || "").trim()
        if (!siteId || !mediaId) {
            return new NextResponse("Invalid media request", { status: 400 })
        }

        const updated = await db.$transaction(async (tx) => {
            const media = await tx.inventorySiteMedia.findFirst({
                where: {
                    id: mediaId,
                    inventoryHoardingId: siteId,
                    isActive: true,
                },
                select: {
                    id: true,
                    type: true,
                },
            })

            if (!media) return null

            await tx.inventorySiteMedia.update({
                where: { id: media.id },
                data: {
                    isActive: false,
                    archivedAt: new Date(),
                    replacedAt: new Date(),
                    replacedById: Number.isInteger(userId) ? userId : null,
                },
            })

            if (media.type === InventorySiteMediaType.IMAGE) {
                const nextImage = await tx.inventorySiteMedia.findFirst({
                    where: {
                        inventoryHoardingId: siteId,
                        type: InventorySiteMediaType.IMAGE,
                        isActive: true,
                    },
                    orderBy: [
                        { sortOrder: "asc" },
                        { createdAt: "asc" },
                    ],
                    select: { url: true },
                })

                await tx.inventoryHoarding.update({
                    where: { id: siteId },
                    data: { imageUrl: nextImage?.url || null },
                })
            }

            return tx.inventoryHoarding.findUnique({
                where: { id: siteId },
                select: {
                    id: true,
                    siteMedia: {
                        where: { isActive: true },
                        orderBy: [
                            { type: "asc" },
                            { sortOrder: "asc" },
                            { createdAt: "asc" },
                        ],
                        select: {
                            id: true,
                            type: true,
                            source: true,
                            key: true,
                            url: true,
                            fileName: true,
                            mimeType: true,
                            size: true,
                            sortOrder: true,
                            isActive: true,
                            uploadedById: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                    },
                },
            })
        })

        if (!updated) {
            return new NextResponse("Media not found", { status: 404 })
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

        console.error("SITE_MEDIA_DELETE_MEDIA", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
