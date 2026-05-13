import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { serializeDecimal } from "@/lib/utils"
import VendorAssignmentsAdminClient from "@/components/dashboard/admin/VendorAssignmentsAdminClient"

export default async function AdminVendorAssignmentsPage() {
    const session = await getServerSession(authOptions)
    if (!session) redirect("/login")
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) redirect("/dashboard")

    const [vendors, sites, leads, assignments] = await Promise.all([
        db.user.findMany({
            where: { role: "VENDOR" },
            orderBy: { name: "asc" },
            select: { id: true, name: true, email: true }
        }),
        db.inventoryHoarding.findMany({
            where: { isActive: true },
            orderBy: [
                { state: "asc" },
                { district: "asc" },
                { outletName: "asc" },
                { id: "asc" },
            ],
            select: {
                id: true,
                inventoryCode: true,
                outletName: true,
                locationName: true,
                city: true,
                district: true,
                state: true,
            }
        }),
        db.lead.findMany({
            orderBy: { createdAt: "desc" },
            take: 200,
            select: { id: true, customerName: true }
        }),
        db.vendorSiteAssignment.findMany({
            orderBy: { createdAt: "desc" },
            take: 500,
            include: {
                vendor: {
                    select: { id: true, name: true, email: true }
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
                lead: {
                    select: {
                        id: true,
                        customerName: true,
                        email: true
                    }
                }
            }
        })
    ])

    return (
        <VendorAssignmentsAdminClient
            vendors={serializeDecimal(vendors) as any}
            sites={serializeDecimal(sites) as any}
            leads={serializeDecimal(leads) as any}
            assignments={serializeDecimal(assignments) as any}
        />
    )
}
