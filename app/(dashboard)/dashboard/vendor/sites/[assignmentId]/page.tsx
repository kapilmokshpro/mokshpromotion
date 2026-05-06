import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import VendorSiteDetailClient from "@/components/dashboard/vendor/VendorSiteDetailClient"
import { serializeDecimal } from "@/lib/utils"

export default async function VendorSiteDetailPage({
    params
}: {
    params: { assignmentId: string }
}) {
    const session = await getServerSession(authOptions)
    if (!session) redirect("/login")
    if (session.user.role !== "VENDOR") redirect("/dashboard")

    const vendorId = Number(session.user.id)

    const assignment = await db.vendorSiteAssignment.findUnique({
        where: { id: params.assignmentId },
        include: {
            inventoryHoarding: {
                select: {
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
        redirect("/dashboard/vendor/sites")
    }

    return <VendorSiteDetailClient assignment={serializeDecimal(assignment) as any} />
}

