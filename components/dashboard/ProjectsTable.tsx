"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, FileText, Loader2, Tag, Building2, UserCircle, DollarSign } from "lucide-react"
import DiscountRequestModal from "./DiscountRequestModal"
import { TableShell, Badge, EmptyState } from "./DashboardComponents"
import { formatDateInIndia } from "@/lib/utils"

interface UnifiedProject {
    id: string
    originalId: number
    type: 'PROJECT' | 'LEAD'
    title: string
    customerName: string
    customerCompany: string
    status: string
    createdAt: string | Date
    assigneeName: string
    paymentStatus: string
    discountPct?: number | null
    couponCode?: string | null
}

interface ProjectsTableProps {
    projects: UnifiedProject[]
}

export default function ProjectsTable({ projects }: ProjectsTableProps) {
    const router = useRouter()
    const [updatingId, setUpdatingId] = useState<number | null>(null)
    const [openDiscountModalId, setOpenDiscountModalId] = useState<number | null>(null)

    const updateStatus = async (id: number, newStatus: string) => {
        setUpdatingId(id)
        try {
            const res = await fetch(`/api/projects/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            })

            if (!res.ok) throw new Error("Failed to update status")
            router.refresh()
        } catch (error) {
            console.error(error)
            alert("Failed to update status")
        } finally {
            setUpdatingId(null)
        }
    }

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'success'
            case 'CANCELLED': return 'destructive'
            case 'DRAFT': return 'outline'
            case 'FOLLOW_UP': return 'warning'
            case 'INTERESTED': return 'default'
            default: return 'default'
        }
    }

    const getPaymentStatusBadge = (status: string) => {
        if (status === 'Paid') return <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs font-medium border border-green-100">Paid</span>
        if (status === 'Unpaid') return <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs font-medium border border-red-100">Unpaid</span>
        return <span className="text-gray-500 bg-gray-50 px-2 py-0.5 rounded text-xs font-medium border border-gray-100">{status}</span>
    }

    return (
        <div className="space-y-4">
            <div className="md:hidden space-y-3">
                {projects.length === 0 ? (
                    <div className="py-8">
                        <EmptyState
                            title="No projects found"
                            description="Start by creating a new project."
                            image={<Building2 className="w-8 h-8 text-gray-300" />}
                        />
                    </div>
                ) : (
                    projects.map((project) => (
                        <div key={project.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-sm font-semibold text-gray-900">{project.title}</div>
                                    <div className="text-xs text-gray-500">ID: #{project.originalId}</div>
                                </div>
                                <Badge variant={getStatusBadgeVariant(project.status)}>
                                    {project.status.replace(/_/g, " ")}
                                </Badge>
                            </div>
                            <div className="text-xs text-gray-600">Customer: {project.customerName}</div>
                            <div className="text-xs text-gray-600">Assignee: {project.assigneeName}</div>
                            <div>{getPaymentStatusBadge(project.paymentStatus)}</div>
                            <div className="text-xs text-gray-500">{formatDateInIndia(project.createdAt)}</div>
                        </div>
                    ))
                )}
            </div>

            <div className="hidden md:block">
            <TableShell>
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Project/Lead</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignee</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                        {projects.length === 0 ? (
                            <tr>
                                <td colSpan={6}>
                                    <div className="py-12">
                                        <EmptyState
                                            title="No projects found"
                                            description="Start by creating a new project."
                                            image={<Building2 className="w-8 h-8 text-gray-300" />}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            projects.map((project) => (
                                <tr key={project.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5">
                                                {project.type === 'PROJECT' ? (
                                                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded">
                                                        <Building2 className="w-4 h-4" />
                                                    </div>
                                                ) : (
                                                    <div className="p-1.5 bg-amber-100 text-amber-600 rounded">
                                                        <UserCircle className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                                    {project.title}
                                                    {project.discountPct && Number(project.discountPct) > 0 && (
                                                        <span className="bg-green-100 text-green-700 border border-green-200 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                                            <Tag className="w-3 h-3" /> {Number(project.discountPct)}% Off
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                                    <span className="font-mono bg-gray-100 px-1 rounded text-gray-600">ID: #{project.originalId}</span>
                                                    <span className="text-gray-300">|</span>
                                                    <span>{formatDateInIndia(project.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 font-medium">{project.customerName}</div>
                                        <div className="text-xs text-gray-500">{project.customerCompany}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                                {project.assigneeName.charAt(0)}
                                            </div>
                                            {project.assigneeName}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge variant={getStatusBadgeVariant(project.status)}>
                                            {project.status.replace(/_/g, " ")}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getPaymentStatusBadge(project.paymentStatus)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                        {project.type === 'PROJECT' ? (
                                            <>
                                                {/* Discount Button */}
                                                {(project.status === "DRAFT" || project.status === "IN_SALES") && (
                                                    <button
                                                        onClick={() => setOpenDiscountModalId(project.originalId)}
                                                        className="text-orange-600 hover:text-orange-900 hover:bg-orange-50 px-2 py-1 rounded inline-flex items-center gap-1.5 text-xs transition-colors"
                                                    >
                                                        <Tag className="w-3.5 h-3.5" />
                                                        {project.discountPct ? "Update" : "Discount"}
                                                    </button>
                                                )}

                                                {/* Send to Finance */}
                                                {(project.status === "DRAFT" || project.status === "IN_SALES") && (
                                                    <button
                                                        onClick={() => updateStatus(project.originalId, "IN_FINANCE")}
                                                        disabled={updatingId === project.originalId}
                                                        className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 px-2 py-1 rounded inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors font-medium text-xs"
                                                        title="Handover to Finance"
                                                    >
                                                        {updatingId === project.originalId ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <>
                                                                To Finance <ArrowRight className="w-3.5 h-3.5" />
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                                {project.status === "IN_FINANCE" && (
                                                    <span className="text-gray-400 inline-flex items-center gap-1.5 text-xs">
                                                        <FileText className="w-3.5 h-3.5" /> Pending Invoice
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">Lead Item</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                </div>
            </TableShell>
            </div>

            {openDiscountModalId && (
                <DiscountRequestModal
                    isOpen={true}
                    projectId={openDiscountModalId}
                    onClose={() => setOpenDiscountModalId(null)}
                />
            )}
        </div>
    )
}
