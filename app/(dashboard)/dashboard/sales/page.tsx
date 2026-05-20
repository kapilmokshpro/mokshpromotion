import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Users, Phone, Mail, Calendar, ArrowRight, CheckCircle2, Clock, PlayCircle } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SalesDashboard() {
    const session = await getServerSession(authOptions)
    if (!session) redirect("/login")

    const userId = Number(session.user.id)
    const isSales = session.user.role === 'SALES'

    // Filter by user if Sales role, otherwise view all (or adapt as needed)
    // For "My Leads" metric, strictly filter by salesUserId
    const whereUser = isSales ? { salesUserId: userId } : {}

    const totalLeads = await db.lead.count({ where: whereUser })

    // Active: Work in progress (not closed, not lost, not just new)
    const activeDeals = await db.lead.count({
        where: {
            ...whereUser,
            status: { in: ['INTERESTED', 'IN_PROGRESS', 'HANDOFF_TO_OPS', 'PRINTING', 'INSTALLATION', 'FOLLOW_UP'] }
        }
    })

    const wonDeals = await db.lead.count({
        where: {
            ...whereUser,
            status: 'DEAL_CLOSED'
        }
    })

    const lostDeals = await db.lead.count({
        where: {
            ...whereUser,
            status: 'LOST'
        }
    })

    const closedTotal = wonDeals + lostDeals
    const conversionRate = closedTotal > 0 ? Math.round((wonDeals / closedTotal) * 100) : 0

    // Fetch Recent 5 Leads
    const recentLeads = await db.lead.findMany({
        where: whereUser,
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: {
            assignee: { select: { name: true } }
        }
    })

    // Fetch status counts for funnel
    const allLeadsForFunnel = await db.lead.findMany({
        where: whereUser,
        select: { status: true }
    })

    const funnelCounts = {
        NEW: 0,
        FOLLOW_UP: 0,
        INTERESTED: 0,
        IN_PROGRESS: 0,
        DEAL_CLOSED: 0,
        LOST: 0
    }

    allLeadsForFunnel.forEach(lead => {
        const status = lead.status as keyof typeof funnelCounts
        if (funnelCounts[status] !== undefined) {
            funnelCounts[status]++
        }
    })

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'NEW':
                return 'bg-blue-50 text-blue-700 border-blue-200'
            case 'FOLLOW_UP':
                return 'bg-yellow-50 text-yellow-700 border-yellow-200'
            case 'INTERESTED':
                return 'bg-purple-50 text-purple-700 border-purple-200'
            case 'IN_PROGRESS':
                return 'bg-indigo-50 text-indigo-700 border-indigo-200'
            case 'DEAL_CLOSED':
                return 'bg-green-50 text-green-700 border-green-200'
            case 'LOST':
                return 'bg-red-50 text-red-700 border-red-200'
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200'
        }
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Sales Overview</h1>
                    <p className="text-sm text-gray-500 mt-1">Monitor your pipeline metrics, recent inquiries, and lead conversion performance.</p>
                </div>
                <Link
                    href="/dashboard/sales/leads"
                    className="flex items-center gap-2 bg-[#002147] hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                    Manage Leads <ArrowRight className="w-4 h-4" />
                </Link>
            </div>

            {/* Metrics Row */}
            <div className="grid gap-4 md:grid-cols-4">
                <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Leads</h3>
                        <Users className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{totalLeads}</p>
                    <p className="text-xs text-gray-400 mt-1">All leads in the database</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Deals</h3>
                        <PlayCircle className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{activeDeals}</p>
                    <p className="text-xs text-gray-400 mt-1">In progress & follow-ups</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Closed Won</h3>
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-green-600 mt-2">{wonDeals}</p>
                    <p className="text-xs text-gray-400 mt-1">Deals successfully closed</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversion Rate</h3>
                        <Clock className="w-5 h-5 text-purple-500" />
                    </div>
                    <p className="text-3xl font-bold text-purple-600 mt-2">{conversionRate}%</p>
                    <p className="text-xs text-gray-400 mt-1">Based on closed won vs lost</p>
                </div>
            </div>

            {/* Dashboard Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Leads */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900">Recent Leads</h2>
                        <Link href="/dashboard/sales/leads" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                            View All
                        </Link>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        {recentLeads.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p className="font-medium text-gray-600">No leads found</p>
                                <p className="text-sm text-gray-400 mt-1">Create or upload leads to see them here.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Lead Details</th>
                                            <th className="px-6 py-4 font-semibold">Status</th>
                                            <th className="px-6 py-4 font-semibold">Assignee</th>
                                            <th className="px-6 py-4 font-semibold">Created At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {recentLeads.map((lead) => (
                                            <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-900">{lead.customerName}</div>
                                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="w-3 h-3" /> {lead.phone}
                                                        </span>
                                                        {lead.email && (
                                                            <span className="flex items-center gap-1">
                                                                <Mail className="w-3 h-3" /> {lead.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(lead.status)}`}>
                                                        {lead.status.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {lead.assignee?.name || <span className="text-gray-400 italic text-xs">Unassigned</span>}
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 text-xs">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                        {new Date(lead.createdAt).toLocaleDateString(undefined, {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sales Pipeline Funnel Breakdown */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900">Lead Pipeline</h2>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
                        <div className="space-y-4">
                            {/* New Leads */}
                            <div>
                                <div className="flex justify-between text-sm font-medium mb-1">
                                    <span className="text-blue-700 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                        New Leads
                                    </span>
                                    <span className="text-gray-900">{funnelCounts.NEW}</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-500 transition-all duration-500" 
                                        style={{ width: `${totalLeads > 0 ? (funnelCounts.NEW / totalLeads) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Follow Up */}
                            <div>
                                <div className="flex justify-between text-sm font-medium mb-1">
                                    <span className="text-yellow-700 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                        Follow Up
                                    </span>
                                    <span className="text-gray-900">{funnelCounts.FOLLOW_UP}</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-yellow-500 transition-all duration-500" 
                                        style={{ width: `${totalLeads > 0 ? (funnelCounts.FOLLOW_UP / totalLeads) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Interested */}
                            <div>
                                <div className="flex justify-between text-sm font-medium mb-1">
                                    <span className="text-purple-700 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                        Interested
                                    </span>
                                    <span className="text-gray-900">{funnelCounts.INTERESTED}</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-purple-500 transition-all duration-500" 
                                        style={{ width: `${totalLeads > 0 ? (funnelCounts.INTERESTED / totalLeads) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* In Progress */}
                            <div>
                                <div className="flex justify-between text-sm font-medium mb-1">
                                    <span className="text-indigo-700 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                        In Progress
                                    </span>
                                    <span className="text-gray-900">{funnelCounts.IN_PROGRESS}</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-500 transition-all duration-500" 
                                        style={{ width: `${totalLeads > 0 ? (funnelCounts.IN_PROGRESS / totalLeads) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Closed Won */}
                            <div>
                                <div className="flex justify-between text-sm font-medium mb-1">
                                    <span className="text-green-700 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        Closed Won
                                    </span>
                                    <span className="text-gray-900">{funnelCounts.DEAL_CLOSED}</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-green-500 transition-all duration-500" 
                                        style={{ width: `${totalLeads > 0 ? (funnelCounts.DEAL_CLOSED / totalLeads) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Lost */}
                            <div>
                                <div className="flex justify-between text-sm font-medium mb-1">
                                    <span className="text-red-700 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                        Lost
                                    </span>
                                    <span className="text-gray-900">{funnelCounts.LOST}</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-red-500 transition-all duration-500" 
                                        style={{ width: `${totalLeads > 0 ? (funnelCounts.LOST / totalLeads) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 text-xs text-gray-500 text-center">
                            Pipeline counts represent active lead conversion stages.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
