import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { serializeDecimal } from "@/lib/utils"
import SiteMediaUploadClient from "@/components/dashboard/site-media/SiteMediaUploadClient"
import { mapSiteMediaForClient } from "@/lib/site-media"

const parseSiteId = (value: string) => {
    const id = Number(value)
    return Number.isInteger(id) && id > 0 ? id : null
}

export default async function SiteMediaSiteDetailPage({
    params,
}: {
    params: { siteId: string }
}) {
    const session = await getServerSession(authOptions)
    if (!session) redirect("/login")

    if (!["SITE_MEDIA", "ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
        redirect("/dashboard")
    }

    const siteId = parseSiteId(params.siteId)
    if (!siteId) {
        redirect("/dashboard/site-media/sites")
    }

    const site = await db.inventoryHoarding.findUnique({
        where: { id: siteId },
        select: {
            id: true,
            inventoryCode: true,
            huid: true,
            outletName: true,
            name: true,
            locationName: true,
            city: true,
            district: true,
            state: true,
            view360Url: true,
            imageUrl: true,
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

    if (!site) {
        redirect("/dashboard/site-media/sites")
    }

    const payload = serializeDecimal({
        id: site.id,
        siteCode: site.inventoryCode || site.huid || "",
        outletName: site.outletName || site.name || "",
        locationName: site.locationName,
        city: site.city,
        district: site.district,
        state: site.state,
        view360Url: site.view360Url,
        fallbackImageUrl: site.imageUrl,
        media: {
            images: site.siteMedia
                .filter((media) => media.type === "IMAGE")
                .slice(0, 5)
                .map(mapSiteMediaForClient),
            videos: site.siteMedia
                .filter((media) => media.type === "VIDEO")
                .slice(0, 1)
                .map(mapSiteMediaForClient),
        },
    })

    return <SiteMediaUploadClient siteId={site.id} initialSite={payload as any} />
}
