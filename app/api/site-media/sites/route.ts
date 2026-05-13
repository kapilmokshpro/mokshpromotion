import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireSiteMediaSession } from "@/lib/site-media-auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    try {
        const guard = await requireSiteMediaSession()
        if (guard.error) return guard.error

        const { searchParams } = new URL(req.url)
        const state = (searchParams.get("state") || "").trim()
        const district = (searchParams.get("district") || "").trim()
        const q = (searchParams.get("q") || "").trim()
        const limit = Math.min(Number(searchParams.get("limit") || "80"), 200)

        const andConditions: Prisma.InventoryHoardingWhereInput[] = [{ isActive: true }]

        if (state) {
            andConditions.push({ state })
        }
        if (district) {
            andConditions.push({ district })
        }
        if (q) {
            andConditions.push({
                OR: [
                    { outletName: { contains: q, mode: "insensitive" } },
                    { name: { contains: q, mode: "insensitive" } },
                    { inventoryCode: { contains: q, mode: "insensitive" } },
                    { huid: { contains: q, mode: "insensitive" } },
                    { locationName: { contains: q, mode: "insensitive" } },
                    { city: { contains: q, mode: "insensitive" } },
                    { district: { contains: q, mode: "insensitive" } },
                ],
            })
        }

        const where: Prisma.InventoryHoardingWhereInput = andConditions.length ? { AND: andConditions } : {}

        const sites = await db.inventoryHoarding.findMany({
            where,
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
                siteMedia: {
                    where: { isActive: true },
                    select: {
                        type: true,
                    },
                },
            },
            orderBy: [
                { state: "asc" },
                { district: "asc" },
                { outletName: "asc" },
            ],
            take: Number.isFinite(limit) && limit > 0 ? limit : 80,
        })

        return NextResponse.json({
            sites: sites.map((site) => {
                const activeImageCount = site.siteMedia.filter((media) => media.type === "IMAGE").length
                const activeVideoCount = site.siteMedia.filter((media) => media.type === "VIDEO").length

                return {
                    id: site.id,
                    siteCode: site.inventoryCode || site.huid || "",
                    outletName: site.outletName || site.name || "",
                    locationName: site.locationName,
                    city: site.city,
                    district: site.district,
                    state: site.state,
                    view360Url: site.view360Url,
                    mediaCount: {
                        images: activeImageCount,
                        videos: activeVideoCount,
                    },
                }
            }),
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

        console.error("SITE_MEDIA_SITES_GET", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
