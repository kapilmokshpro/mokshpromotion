import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import LeadsTable from "@/components/dashboard/LeadsTable"

export default async function LeadsPage() {
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/login")
    }

    // Role-based access control for data
    // Role-based access control for data
    let whereClause: any = {}

    if (['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
        whereClause = {}
    } else if (session.user.role === 'SALES') {
        // Sales Users: ONLY see leads assigned to them (either as current assignee or sales rep)
        // STRICT: Cannot see unassigned leads
        whereClause = {
            OR: [
                { assigneeId: Number(session.user.id) },
                { salesUserId: Number(session.user.id) }
            ]
        }
    } else if (session.user.role === 'FINANCE') {
        whereClause = { financeUserId: Number(session.user.id) }
    } else if (session.user.role === 'OPERATIONS') {
        whereClause = { opsUserId: Number(session.user.id) }
    } else {
        // Fallback: See nothing or just their direct assignments
        whereClause = { assigneeId: Number(session.user.id) }
    }

    const [leads, users] = await Promise.all([
        db.lead.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                assignee: { select: { name: true } },
                salesUser: { select: { name: true } },
                financeUser: { select: { name: true } },
                opsUser: { select: { name: true } },
                logs: {
                    orderBy: { createdAt: 'desc' },
                    include: { user: { select: { name: true, role: true } } }
                }
            }
        }),
        // Fetch users for assignment dropdown (Admin only needs this effectively, but we pass to all for simplicity)
        db.user.findMany({
            select: { id: true, name: true, role: true },
            orderBy: { name: 'asc' }
        })
    ])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Leads Management</h1>
                    <p className="text-gray-500 mt-1">Manage all incoming quote requests and leads.</p>
                </div>
            </div>

            <LeadsTable
                initialLeads={leads as any}
                currentUserId={Number(session.user.id)}
                currentUserRole={session.user.role}
                users={users}
            />
        </div>
    )
}
