import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { serializeDecimal } from "@/lib/utils"
import VendorProofsAdminClient from "@/components/dashboard/admin/VendorProofsAdminClient"

export default async function AdminVendorProofsPage() {
    const session = await getServerSession(authOptions)
    if (!session) redirect("/login")
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) redirect("/dashboard")

    const proofs = await db.vendorSiteProof.findMany({
        orderBy: { createdAt: "desc" },
        take: 300,
        include: {
            vendor: {
                select: { id: true, name: true, email: true }
            },
            assignment: {
                include: {
                    lead: {
                        select: {
                            id: true,
                            customerName: true,
                            email: true,
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

    return <VendorProofsAdminClient proofs={serializeDecimal(proofs) as any} />
}

