import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import VendorsAdminClient from "@/components/dashboard/admin/VendorsAdminClient"
import { serializeDecimal } from "@/lib/utils"

export default async function AdminVendorsPage() {
    const session = await getServerSession(authOptions)
    if (!session) redirect("/login")
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) redirect("/dashboard")

    const vendors = await db.user.findMany({
        where: { role: "VENDOR" },
        orderBy: { createdAt: "desc" },
        include: {
            vendorProfile: true,
            vendorAssignments: {
                select: {
                    id: true,
                    status: true
                }
            }
        }
    })

    return <VendorsAdminClient initialVendors={serializeDecimal(vendors) as any} />
}

