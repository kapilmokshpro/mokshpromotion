import { db } from "@/lib/db"
import { PageHeader, StatCard } from "@/components/dashboard/DashboardComponents"
import { Users, Building2, FileText } from "lucide-react"
import Link from "next/link"

export default async function AdminDashboard() {
    const leadCount = await db.lead.count()
    const projectCount = await db.project.count({
        where: {
            status: {
                notIn: ['COMPLETED', 'CANCELLED']
            }
        }
    })
    const pendingInvoiceCount = await db.invoice.count({
        where: {
            status: 'PENDING'
        }
    })

    return (
        <div className="space-y-8 animate-fade-in-up">
            <PageHeader
                title="Admin Overview"
                description="Welcome back. Here's what's happening today."
            />

            <div className="grid gap-6 md:grid-cols-3">
                <StatCard
                    title="Total Leads"
                    value={leadCount}
                    icon={<Users className="w-5 h-5" />}
                    description="Potential clients in pipeline"
                />
                <StatCard
                    title="Active Projects"
                    value={projectCount}
                    icon={<Building2 className="w-5 h-5" />}
                    description="Campaigns currently running"
                />
                <StatCard
                    title="Pending Invoices"
                    value={pendingInvoiceCount}
                    icon={<FileText className="w-5 h-5" />}
                    description="Awaiting payment"
                />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Vendor Operations</h2>
                <div className="flex flex-wrap gap-3">
                    <Link href="/dashboard/admin/vendors" className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
                        Manage Vendors
                    </Link>
                    <Link href="/dashboard/admin/vendor-assignments" className="px-4 py-2 rounded-md text-sm font-medium bg-gray-900 text-white hover:bg-black">
                        Assign Sites
                    </Link>
                    <Link href="/dashboard/admin/vendor-proofs" className="px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700">
                        Review Proofs
                    </Link>
                </div>
            </div>
        </div>
    )
}
