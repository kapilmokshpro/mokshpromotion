import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import ProjectsTable from "@/components/dashboard/ProjectsTable"
import NewProjectModal from "@/components/dashboard/NewProjectModal"

export default async function ProjectsPage() {
    const session = await getServerSession(authOptions)

    // Fetch Projects, active Leads, and Customers concurrently
    const [projectsData, leadsData, customers] = await Promise.all([
        db.project.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                customer: true,
                salesUser: true,
                invoices: true,
            }
        }),
        db.lead.findMany({
            where: {
                status: {
                    in: ['FOLLOW_UP', 'INTERESTED', 'IN_PROGRESS', 'PROCESSING']
                }
            },
            orderBy: { createdAt: 'desc' },
            include: {
                assignee: true,
                salesUser: true
            }
        }),
        db.customer.findMany({
            select: { id: true, name: true, company: true },
            orderBy: { name: 'asc' }
        })
    ])

    // 3. Transform to unified shape
    const unifiedProjects = [
        ...projectsData.map(p => {
            // Determine payment status based on invoices
            let paymentStatus = 'Pending Invoice'
            const hasInvoice = p.invoices.length > 0

            if (hasInvoice) {
                // Check invoice status
                const latestInvoice = p.invoices[p.invoices.length - 1]
                paymentStatus = latestInvoice.status === 'PAID' ? 'Paid' : 'Unpaid'
            }

            return {
                id: `PROJ-${p.id}`, // String ID to avoid collision
                originalId: p.id,
                type: 'PROJECT' as const,
                title: p.title,
                customerName: p.customer.name,
                customerCompany: p.customer.company || '',
                status: p.status,
                createdAt: p.createdAt,
                assigneeName: p.salesUser?.name || 'Unassigned',
                paymentStatus: paymentStatus,
                discountPct: p.discountPct,
                couponCode: p.couponCode,
            }
        }),
        ...leadsData.map(l => ({
            id: `LEAD-${l.id}`,
            originalId: l.id,
            type: 'LEAD' as const,
            title: l.notes ? (l.notes.length > 30 ? l.notes.substring(0, 30) + "..." : l.notes) : "New Lead", // Leads don't have titles, use note snippet or default
            customerName: l.customerName,
            customerCompany: '', // Lead has no company field usually
            status: l.status,
            createdAt: l.createdAt,
            assigneeName: l.assignee?.name || l.salesUser?.name || 'Unassigned',
            paymentStatus: 'Lead Stage', // No payments for leads yet
            discountPct: null,
            couponCode: null,
        }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())



    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Projects & Active Leads</h1>
                <NewProjectModal customers={customers} />
            </div>

            <ProjectsTable projects={unifiedProjects} />
        </div>
    )
}
