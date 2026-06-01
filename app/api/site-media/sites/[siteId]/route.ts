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

export async function PATCH(
    req: Request,
    { params }: { params: { siteId: string } }
) {
    try {
        const guard = await requireSiteMediaSession()
        if (guard.error) return guard.error

        const siteId = parseSiteId(params.siteId)
        if (!siteId) {
            return new NextResponse("Invalid site id", { status: 400 })
        }

        const body = (await req.json()) as { view360Url?: string | null }
        const rawView360Url = typeof body.view360Url === "string" ? body.view360Url.trim() : ""
        const normalizedView360Url = rawView360Url && !/^https?:\/\//i.test(rawView360Url)
            ? `https://${rawView360Url}`
            : rawView360Url

        if (normalizedView360Url) {
            try {
                new URL(normalizedView360Url)
            } catch {
                return new NextResponse("Enter a valid 360 view link", { status: 400 })
            }
        }

        const updated = await db.inventoryHoarding.update({
            where: { id: siteId },
            data: {
                view360Url: normalizedView360Url || null,
            },
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

        const imageMedia = updated.siteMedia
            .filter((media) => media.type === "IMAGE")
            .slice(0, 5)
            .map(mapSiteMediaForClient)
        const videoMedia = updated.siteMedia
            .filter((media) => media.type === "VIDEO")
            .slice(0, 1)
            .map(mapSiteMediaForClient)

        return NextResponse.json({
            site: {
                id: updated.id,
                siteCode: updated.inventoryCode || updated.huid || "",
                outletName: updated.outletName || updated.name || "",
                locationName: updated.locationName,
                city: updated.city,
                district: updated.district,
                state: updated.state,
                view360Url: updated.view360Url,
                fallbackImageUrl: updated.imageUrl,
                media: {
                    images: imageMedia,
                    videos: videoMedia,
                },
            },
        })
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            String((error as { code?: string }).code || "") === "P2025"
        ) {
            return new NextResponse("Site not found", { status: 404 })
        }

        console.error("SITE_MEDIA_SITE_PATCH", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
