import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { PageHeader, StatCard } from "@/components/dashboard/DashboardComponents"
import { CheckCircle2, Clock3, AlertTriangle, Upload } from "lucide-react"

export default async function VendorDashboardPage() {
    const session = await getServerSession(authOptions)
    if (!session) redirect("/login")
    if (session.user.role !== "VENDOR") redirect("/dashboard")

    const vendorId = Number(session.user.id)
    const [
        totalAssignments,
        pendingUpload,
        submitted,
        approved,
        reuploadRequested
    ] = await Promise.all([
        db.vendorSiteAssignment.count({ where: { vendorId } }),
        db.vendorSiteAssignment.count({
            where: {
                vendorId,
                status: { in: ["ASSIGNED_TO_VENDOR", "PENDING_VENDOR_UPLOAD", "REJECTED", "REUPLOAD_REQUESTED"] }
            }
        }),
        db.vendorSiteAssignment.count({ where: { vendorId, status: "SUBMITTED_FOR_APPROVAL" } }),
        db.vendorSiteAssignment.count({ where: { vendorId, status: { in: ["APPROVED", "CLIENT_NOTIFIED"] } } }),
        db.vendorSiteAssignment.count({ where: { vendorId, status: "REUPLOAD_REQUESTED" } }),
    ])

    return (
        <div className="space-y-8">
            <PageHeader
                title="Vendor Dashboard"
                description="Track assigned sites and upload live proof with location."
            />

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
                <StatCard title="Assigned Sites" value={totalAssignments} icon={<Upload className="w-5 h-5" />} />
                <StatCard title="Pending Upload" value={pendingUpload} icon={<Clock3 className="w-5 h-5" />} />
                <StatCard title="Under Review" value={submitted} icon={<Upload className="w-5 h-5" />} />
                <StatCard title="Approved" value={approved} icon={<CheckCircle2 className="w-5 h-5" />} />
                <StatCard title="Re-upload Needed" value={reuploadRequested} icon={<AlertTriangle className="w-5 h-5" />} />
            </div>
        </div>
    )
}

