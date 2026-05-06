import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireVendorSession } from "@/lib/vendor-auth"

export const dynamic = "force-dynamic"

export async function GET(
    _req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const guard = await requireVendorSession()
        if (guard.error) return guard.error
        const session = guard.session
        const vendorId = Number(session.user.id)

        const assignment = await db.vendorSiteAssignment.findUnique({
            where: { id: params.id },
            include: {
                inventoryHoarding: {
                    select: {
                        id: true,
                        inventoryCode: true,
                        outletName: true,
                        locationName: true,
                        city: true,
                        district: true,
                        state: true,
                        imageUrl: true,
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
                    include: {
                        media: {
                            orderBy: { createdAt: "asc" }
                        }
                    }
                }
            }
        })

        if (!assignment || assignment.vendorId !== vendorId) {
            return new NextResponse("Assignment not found", { status: 404 })
        }

        return NextResponse.json(assignment)
    } catch (error) {
        console.error("VENDOR_ASSIGNMENT_GET", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
