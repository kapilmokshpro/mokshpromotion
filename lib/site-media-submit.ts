import { InventorySiteMediaType } from "@prisma/client"
import { db } from "@/lib/db"
import { MAX_SITE_MEDIA_IMAGES } from "@/lib/site-media-storage"

export type PersistableSiteMedia = {
    type: InventorySiteMediaType
    key: string
    fileName: string
    mimeType: string
    size: number
    url: string | null
}

export async function persistSubmittedSiteMedia(params: {
    siteId: number
    userId: number | null
    media: PersistableSiteMedia[]
}) {
    const { siteId, userId, media } = params

    const images = media.filter((item) => item.type === InventorySiteMediaType.IMAGE)
    const videos = media.filter((item) => item.type === InventorySiteMediaType.VIDEO)

    const now = new Date()

    const updated = await db.$transaction(async (tx) => {
        const existingImages = images.length > 0
            ? await tx.inventorySiteMedia.findMany({
                where: {
                    inventoryHoardingId: siteId,
                    type: InventorySiteMediaType.IMAGE,
                    isActive: true,
                },
                orderBy: [
                    { sortOrder: "asc" },
                    { createdAt: "asc" },
                ],
                select: {
                    url: true,
                    sortOrder: true,
                },
            })
            : []

        if (existingImages.length + images.length > MAX_SITE_MEDIA_IMAGES) {
            throw new Error(`This site already has ${existingImages.length} active image(s). Delete images or upload only ${MAX_SITE_MEDIA_IMAGES - existingImages.length} more.`)
        }

        if (videos.length > 0) {
            await tx.inventorySiteMedia.updateMany({
                where: {
                    inventoryHoardingId: siteId,
                    type: InventorySiteMediaType.VIDEO,
                    isActive: true,
                },
                data: {
                    isActive: false,
                    replacedAt: now,
                    replacedById: Number.isInteger(userId || NaN) ? userId : null,
                    archivedAt: now,
                },
            })
        }

        if (images.length > 0) {
            const nextSortOrder = existingImages.reduce((max, image) => Math.max(max, image.sortOrder), -1) + 1

            await tx.inventorySiteMedia.createMany({
                data: images.map((image, index) => ({
                    inventoryHoardingId: siteId,
                    type: InventorySiteMediaType.IMAGE,
                    source: "SITE_MEDIA",
                    key: image.key,
                    url: image.url,
                    fileName: image.fileName,
                    mimeType: image.mimeType,
                    size: image.size,
                    sortOrder: nextSortOrder + index,
                    isActive: true,
                    uploadedById: Number.isInteger(userId || NaN) ? userId : null,
                })),
            })

            await tx.inventoryHoarding.update({
                where: { id: siteId },
                data: {
                    imageUrl: existingImages[0]?.url || images[0]?.url || null,
                },
            })
        }

        if (videos.length > 0) {
            await tx.inventorySiteMedia.createMany({
                data: videos.map((video, index) => ({
                    inventoryHoardingId: siteId,
                    type: InventorySiteMediaType.VIDEO,
                    source: "SITE_MEDIA",
                    key: video.key,
                    url: video.url,
                    fileName: video.fileName,
                    mimeType: video.mimeType,
                    size: video.size,
                    sortOrder: index,
                    isActive: true,
                    uploadedById: Number.isInteger(userId || NaN) ? userId : null,
                })),
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

    return updated
}
