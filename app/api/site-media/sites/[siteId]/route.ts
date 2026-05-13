import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireSiteMediaSession } from "@/lib/site-media-auth"
import { mapSiteMediaForClient } from "@/lib/site-media"

export const dynamic = "force-dynamic"

const parseSiteId = (value: string) => {
    const id = Number(value)
    return Number.isInteger(id) && id > 0 ? id : null
}

export async function GET(
    _req: Request,
    { params }: { params: { siteId: string } }
) {
    try {
        const guard = await requireSiteMediaSession()
        if (guard.error) return guard.error

        const siteId = parseSiteId(params.siteId)
        if (!siteId) {
            return new NextResponse("Invalid site id", { status: 400 })
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
            return new NextResponse("Site not found", { status: 404 })
        }

        const imageMedia = site.siteMedia
            .filter((media) => media.type === "IMAGE")
            .slice(0, 5)
            .map(mapSiteMediaForClient)
        const videoMedia = site.siteMedia
            .filter((media) => media.type === "VIDEO")
            .slice(0, 1)
            .map(mapSiteMediaForClient)

        return NextResponse.json({
            site: {
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
                    images: imageMedia,
                    videos: videoMedia,
                },
            },
        })
    } catch (error) {
        const migrationPending =
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            ["P2021", "P2022"].includes(String((error as { code?: string }).code || ""))

        if (migrationPending) {
            return new NextResponse("Site Media database migration is pending. Run Prisma migration.", { status: 503 })
        }

        console.error("SITE_MEDIA_SITE_GET", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
