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

        if (!state) {
            return new NextResponse("state is required", { status: 400 })
        }

        const grouped = await db.inventoryHoarding.groupBy({
            by: ["district"],
            where: {
                isActive: true,
                state,
                district: { not: "" },
            },
            _count: { _all: true },
            orderBy: { district: "asc" },
        })

        return NextResponse.json({
            districts: grouped.map((row) => ({
                district: row.district,
                count: row._count._all,
            })),
        })
    } catch (error) {
        console.error("SITE_MEDIA_DISTRICTS_GET", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
