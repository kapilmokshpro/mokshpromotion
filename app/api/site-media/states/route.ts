import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireSiteMediaSession } from "@/lib/site-media-auth"

export const dynamic = "force-dynamic"

export async function GET() {
    try {
        const guard = await requireSiteMediaSession()
        if (guard.error) return guard.error

        const grouped = await db.inventoryHoarding.groupBy({
            by: ["state"],
            where: {
                isActive: true,
                state: { not: "" },
            },
            _count: { _all: true },
            orderBy: { state: "asc" },
        })

        return NextResponse.json({
            states: grouped.map((row) => ({
                state: row.state,
                count: row._count._all,
            })),
        })
    } catch (error) {
        console.error("SITE_MEDIA_STATES_GET", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
