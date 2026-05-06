import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdminVendorSession } from "@/lib/vendor-auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    try {
        const guard = await requireAdminVendorSession()
        if (guard.error) return guard.error

        const { searchParams } = new URL(req.url)
        const status = searchParams.get("status")

        const proofs = await db.vendorSiteProof.findMany({
            where: {
                ...(status ? { status: status as any } : {})
            },
            orderBy: { createdAt: "desc" },
            include: {
                vendor: {
                    select: { id: true, name: true, email: true }
                },
                approvedBy: {
                    select: { id: true, name: true, email: true }
                },
                assignment: {
                    include: {
                        lead: {
                            select: {
                                id: true,
                                customerName: true,
                                email: true
                            }
                        }
                    }
                },
                inventoryHoarding: {
                    select: {
                        id: true,
                        inventoryCode: true,
                        outletName: true,
                        locationName: true,
                        city: true,
                        district: true,
                        state: true,
                    }
                },
                media: {
                    orderBy: { createdAt: "asc" }
                }
            }
        })

        return NextResponse.json(proofs)
    } catch (error) {
        console.error("ADMIN_VENDOR_PROOFS_GET", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
