import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import VendorSitesClient from "@/components/dashboard/vendor/VendorSitesClient"
import { serializeDecimal } from "@/lib/utils"

export default async function VendorSitesPage() {
    const session = await getServerSession(authOptions)
    if (!session) redirect("/login")
    if (session.user.role !== "VENDOR") redirect("/dashboard")

    const vendorId = Number(session.user.id)
    const assignments = await db.vendorSiteAssignment.findMany({
        where: { vendorId },
        orderBy: { createdAt: "desc" },
        include: {
            inventoryHoarding: {
                select: {
                    inventoryCode: true,
                    outletName: true,
                    locationName: true,
                    city: true,
                    district: true,
                    state: true,
                }
            },
            lead: {
                select: {
                    customerName: true,
                }
            },
            proofs: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: {
                    id: true,
                    status: true,
                    submittedAt: true,
                    rejectionReason: true,
                }
            }
        }
    })

    return <VendorSitesClient assignments={serializeDecimal(assignments) as any} />
}

