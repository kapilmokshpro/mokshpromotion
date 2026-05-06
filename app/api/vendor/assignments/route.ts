import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireVendorSession } from "@/lib/vendor-auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    try {
        const guard = await requireVendorSession()
        if (guard.error) return guard.error
        const session = guard.session
        const vendorId = Number(session.user.id)

        const vendorProfile = await db.vendorProfile.findUnique({
            where: { userId: vendorId },
            select: { isActive: true }
        })
        if (vendorProfile && !vendorProfile.isActive) {
            return new NextResponse("Vendor account is inactive", { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const query = (searchParams.get("q") || "").trim()

        const assignments = await db.vendorSiteAssignment.findMany({
            where: {
                vendorId,
                ...(query
                    ? {
                        OR: [
                            { inventoryHoarding: { outletName: { contains: query, mode: "insensitive" } } },
                            { inventoryHoarding: { inventoryCode: { contains: query, mode: "insensitive" } } },
                            { inventoryHoarding: { locationName: { contains: query, mode: "insensitive" } } },
                            { inventoryHoarding: { city: { contains: query, mode: "insensitive" } } },
                            { inventoryHoarding: { district: { contains: query, mode: "insensitive" } } },
                            { lead: { customerName: { contains: query, mode: "insensitive" } } },
                        ]
                    }
                    : {})
            },
            orderBy: { createdAt: "desc" },
            include: {
                inventoryHoarding: {
                    select: {
                        id: true,
                        inventoryCode: true,
                        outletName: true,
                        locationName: true,
                        city: true,
                        district: true,
                        state: true
                    }
                },
                lead: {
                    select: {
                        id: true,
                        customerName: true
                    }
                },
                proofs: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: {
                        id: true,
                        status: true,
                        submittedAt: true,
                        rejectedAt: true,
                        rejectionReason: true
                    }
                }
            }
        })

        return NextResponse.json(assignments)
    } catch (error) {
        console.error("VENDOR_ASSIGNMENTS_GET", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
