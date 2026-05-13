import { InventorySiteMediaType } from "@prisma/client"
import { buildSiteMediaPublicUrl } from "@/lib/site-media-storage"

export type SiteMediaRecordLike = {
    id: string
    type: InventorySiteMediaType
    key: string
    url: string | null
    fileName: string
    mimeType: string
    size: number
    sortOrder: number
    source: string
    isActive: boolean
    uploadedById: number | null
    createdAt: Date
    updatedAt: Date
}

const buildProxyObjectUrl = (key: string) =>
    `/api/site-media/object/${key.split("/").map(encodeURIComponent).join("/")}`

export const resolveSiteMediaUrl = (media: { key: string; url: string | null }) => {
    if (media.key) {
        return buildProxyObjectUrl(media.key)
    }

    if (media.url) return media.url
    return buildSiteMediaPublicUrl(media.key)
}

export const mapSiteMediaForClient = (media: SiteMediaRecordLike) => ({
    id: media.id,
    type: media.type,
    source: media.source,
    key: media.key,
    url: resolveSiteMediaUrl(media),
    fileName: media.fileName,
    mimeType: media.mimeType,
    size: media.size,
    sortOrder: media.sortOrder,
    isActive: media.isActive,
    uploadedById: media.uploadedById,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
})
