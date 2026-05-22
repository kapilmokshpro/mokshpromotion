import { db } from "@/lib/db"
import { PageHeader } from "@/components/dashboard/DashboardComponents"
import { Plus } from "lucide-react"
import OpsKanban from "@/components/dashboard/OpsKanban"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function OperationsPage() {
    const session = await getServerSession(authOptions)

    // Fetch Ops leads and stats concurrently
    const [opsLeads, receivedCount, printingCount, installationCount] = await Promise.all([
        db.lead.findMany({
            where: {
                status: { in: ["HANDOFF_TO_OPS", "PRINTING", "INSTALLATION"] }
            },
            include: {
                assignee: { select: { name: true } },
                salesUser: { select: { name: true } },
                financeUser: { select: { name: true } },
                opsUser: { select: { name: true } },
                logs: {
                    orderBy: { createdAt: 'desc' },
                    include: { user: { select: { name: true, role: true } } }
                },
                campaignItems: {
                    include: {
                        inventoryHoarding: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        }),
        db.lead.count({ where: { status: 'HANDOFF_TO_OPS' } }),
        db.lead.count({ where: { status: 'PRINTING' } }),
        db.lead.count({ where: { status: 'INSTALLATION' } })
    ])

    // Serialize leads to avoid "Decimal" plain object warnings
    const serializedLeads = opsLeads.map(lead => ({
        ...lead,
        baseTotal: Number(lead.baseTotal),
        discountAmount: lead.discountAmount ? Number(lead.discountAmount) : null,
        finalTotal: lead.finalTotal ? Number(lead.finalTotal) : null,
        campaignItems: lead.campaignItems.map(item => ({
            ...item,
            rate: Number(item.rate),
            printingCharge: item.printingCharge ? Number(item.printingCharge) : null,
            total: Number(item.total),
            inventoryHoarding: {
                ...item.inventoryHoarding,
                width: item.inventoryHoarding.width ? Number(item.inventoryHoarding.width) : null,
                height: item.inventoryHoarding.height ? Number(item.inventoryHoarding.height) : null,
                totalArea: item.inventoryHoarding.totalArea ? Number(item.inventoryHoarding.totalArea) : null,
                rate: item.inventoryHoarding.rate ? Number(item.inventoryHoarding.rate) : null,
                printingCharge: item.inventoryHoarding.printingCharge ? Number(item.inventoryHoarding.printingCharge) : null,
                netTotal: item.inventoryHoarding.netTotal ? Number(item.inventoryHoarding.netTotal) : null,
            }
        }))
    }))

    return (
        <div className="space-y-8 h-full flex flex-col animate-fade-in-up">
            <PageHeader
                title="Operations Queue"
                description="Manage incoming leads, printing jobs, and installations."
                action={
                    <button className="flex items-center gap-2 bg-[#002147] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-900 transition-colors shadow-sm">
                        <Plus className="w-4 h-4" /> New Task
                    </button>
                }
            />

            <div className="grid gap-6 md:grid-cols-3 md:min-h-[120px]">
                <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Received</p>
                        <h3 className="text-3xl font-bold text-[#002147] mt-2">{receivedCount}</h3>
                    </div>
                    <div className="h-1 w-full bg-blue-100 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-blue-500 w-full animate-pulse"></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-yellow-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">In Printing</p>
                        <h3 className="text-3xl font-bold text-yellow-600 mt-2">{printingCount}</h3>
                    </div>
                    <div className="h-1 w-full bg-yellow-100 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-yellow-400 w-full animate-pulse"></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Installation</p>
                        <h3 className="text-3xl font-bold text-green-600 mt-2">{installationCount}</h3>
                    </div>
                    <div className="h-1 w-full bg-green-100 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-green-500 w-full animate-pulse"></div>
                    </div>
                </div>
            </div>

            <OpsKanban leads={serializedLeads} currentUserId={Number(session?.user?.id)} />
        </div>
    )
}
