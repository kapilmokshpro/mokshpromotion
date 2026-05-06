"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Edit2, UserPlus, Loader2, Search, User, Trash2, Tag } from "lucide-react"
import { TableShell, Badge, EmptyState } from "./DashboardComponents"
import { formatDateInIndia } from "@/lib/utils"

interface Lead {
    id: number
    customerName: string
    phone: string
    email: string | null
    source: string | null
    status: string
    notes: string | null
    assigneeId: number | null
    createdAt: Date
    assignee: { name: string } | null
    salesUser?: { name: string } | null
    financeUser?: { name: string } | null
    opsUser?: { name: string } | null
    logs?: any[]
    baseTotal: number
}

interface User {
    id: number
    name: string
    role: string
}

interface LeadsTableProps {
    initialLeads: Lead[]
    currentUserId: number
    currentUserRole: string
    users: User[]
}

export default function LeadsTable({ initialLeads, currentUserId, currentUserRole, users }: LeadsTableProps) {
    const router = useRouter()
    const [leads, setLeads] = useState<Lead[]>(initialLeads)
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    // Form Stats
    const [formData, setFormData] = useState<{
        status: string
        notes: string
        financeUserId?: string
        remark?: string
        baseTotal: string
    }>({
        status: "",
        notes: "",
        baseTotal: ""
    })

    const handleEditClick = (lead: Lead) => {
        setSelectedLead(lead)
        setFormData({
            status: lead.status,
            notes: lead.notes || "",
            financeUserId: "",
            remark: "",
            baseTotal: lead.baseTotal?.toString() || "0"
        })
        setIsEditOpen(true)
    }

    const handleSave = async () => {
        if (!selectedLead) return

        setUpdating(true)
        try {
            const body: any = {
                status: formData.status,
                notes: formData.notes
            }

            if (formData.financeUserId) body.financeUserId = Number(formData.financeUserId)
            if (formData.remark) body.remark = formData.remark
            if (formData.baseTotal) body.baseTotal = Number(formData.baseTotal)

            const res = await fetch(`/api/leads/${selectedLead.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            })

            if (!res.ok) throw new Error("Failed to update")

            const updatedLead = await res.json()

            // Update local state
            setLeads(prev => prev.map(l => l.id === updatedLead.id ? { ...l, ...updatedLead, assignee: l.assignee } : l))

            setIsEditOpen(false)
            router.refresh()
        } catch (error) {
            console.error(error)
            alert("Failed to update lead")
        } finally {
            setUpdating(false)
        }
    }

    // Admin Assignment Modal State
    const [isAssignOpen, setIsAssignOpen] = useState(false)
    const [targetAssigneeId, setTargetAssigneeId] = useState<string>("")

    // Check for admin role
    const isAdmin = currentUserRole === "ADMIN"

    const handleAssignSave = async () => {
        if (!selectedLead || !targetAssigneeId) return

        setUpdating(true)
        try {
            const res = await fetch(`/api/leads/${selectedLead.id}/assign`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assigneeId: Number(targetAssigneeId)
                })
            })

            if (!res.ok) {
                const errorText = await res.text()
                throw new Error(errorText || "Failed to assign lead")
            }

            router.refresh()
            const updated = await res.json()
            setLeads(prev => prev.map(l => l.id === updated.id ? { ...l, ...updated } : l))
            setIsAssignOpen(false)
        } catch (error) {
            console.error(error)
            const message = error instanceof Error ? error.message : "Failed to assign lead"
            alert(message)
        } finally {
            setUpdating(false)
        }
    }

    const openAssignModal = (lead: Lead) => {
        setSelectedLead(lead)
        setTargetAssigneeId(lead.assigneeId?.toString() || "")
        setIsAssignOpen(true)
    }

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'NEW': return 'default'
            case 'DEAL_CLOSED': return 'success'
            case 'LOST': return 'destructive'
            default: return 'warning'
        }
    }

    const filteredLeads = leads.filter(l =>
        l.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.phone.includes(searchTerm)
    )

    return (
        <div className="space-y-4">
            {/* Table Actions */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search leads..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <TableShell>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name / Contact</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Latest Remark</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assignee</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>
                                        <div className="py-12">
                                            <EmptyState
                                                title="No leads found"
                                                description={searchTerm ? "Try adjusting your search filters" : "No leads have been added yet."}
                                                image={<User className="w-8 h-8 text-gray-300" />}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-gray-900">{lead.customerName}</div>
                                            <div className="text-sm text-gray-500">{lead.phone}</div>
                                            <div className="text-xs text-gray-400">{lead.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge variant={getStatusBadgeVariant(lead.status)}>
                                                {lead.status.replace('_', ' ')}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                            {lead.logs && lead.logs.length > 0 ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                                                        {lead.logs[0].user?.name}
                                                        <span className="text-[10px] font-normal text-gray-400">({formatDateInIndia(lead.logs[0].createdAt)})</span>
                                                    </span>
                                                    <span className="truncate block text-gray-600" title={lead.logs[0].details}>
                                                        {lead.logs[0].details}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="truncate text-gray-400 italic" title={lead.notes || ""}>
                                                    {lead.notes || "No remarks"}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {lead.assigneeId ? (
                                                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-50 border border-gray-100 text-xs w-fit">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                    User #{lead.assigneeId}
                                                </span>
                                            ) : (
                                                <span className="text-orange-500 flex items-center gap-1.5 text-xs font-medium">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                                                    Unassigned
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => router.push(`/dashboard/sales/leads/${lead.id}`)}
                                                    className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-md flex items-center gap-1 text-xs transition-colors"
                                                    title="View Details & Discounts"
                                                >
                                                    <Tag className="w-3.5 h-3.5" /> Details
                                                </button>
                                                {isAdmin && (
                                                    <>
                                                        <button
                                                            onClick={() => openAssignModal(lead)}
                                                            className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1 transition-colors"
                                                            title="Assign Lead"
                                                        >
                                                            <UserPlus className="w-3.5 h-3.5" /> Assign
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm("Are you sure you want to delete this lead? This cannot be undone.")) {
                                                                    setUpdating(true)
                                                                    try {
                                                                        const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" })
                                                                        if (!res.ok) throw new Error("Failed to delete")
                                                                        setLeads(prev => prev.filter(l => l.id !== lead.id))
                                                                        router.refresh()
                                                                    } catch (error) {
                                                                        console.error(error)
                                                                        alert("Failed to delete lead")
                                                                    } finally {
                                                                        setUpdating(false)
                                                                    }
                                                                }
                                                            }}
                                                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1 transition-colors"
                                                            title="Delete Lead"
                                                        >
                                                            {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                            Delete
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </TableShell>

            {/* Edit Modal */}
            {isEditOpen && selectedLead && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-lg text-gray-900">Update Lead</h3>
                            <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">×</button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <h4 className="font-semibold text-gray-900 text-lg">{selectedLead.customerName}</h4>
                                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                    <span>{selectedLead.email}</span>
                                    <span>•</span>
                                    <span>{selectedLead.phone}</span>
                                </p>
                            </div>

                            {/* Team Details Section - Visible to Sales Rep to track progress */}
                            <div className="grid grid-cols-3 gap-2 text-xs border border-gray-100 bg-gray-50/50 rounded-lg p-3">
                                <div className="space-y-1">
                                    <p className="text-gray-500 font-medium">Sales Rep</p>
                                    <p className="font-semibold text-gray-900 flex items-center gap-1">
                                        <User className="w-3 h-3 text-blue-500" />
                                        {selectedLead.salesUser?.name || selectedLead.assignee?.name || '-'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-gray-500 font-medium">Finance</p>
                                    <p className="font-semibold text-gray-900 flex items-center gap-1">
                                        <User className="w-3 h-3 text-green-500" />
                                        {selectedLead.financeUser?.name || (['DEAL_CLOSED', 'LOST'].includes(selectedLead.status) ? '-' : 'Pending')}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-gray-500 font-medium">Operations</p>
                                    <p className="font-semibold text-gray-900 flex items-center gap-1">
                                        <User className="w-3 h-3 text-purple-500" />
                                        {selectedLead.opsUser?.name || (['DEAL_CLOSED', 'LOST'].includes(selectedLead.status) ? '-' : 'Pending')}
                                    </p>
                                </div>
                            </div>

                            {/* Remarks History - Read Only for reference */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Activity Log / Remarks History</label>
                                <div className="bg-white border border-gray-200 rounded-lg p-3 h-32 overflow-y-auto space-y-3 shadow-sm">
                                    {selectedLead.logs && selectedLead.logs.length > 0 ? (
                                        selectedLead.logs.map((log: any) => (
                                            <div key={log.id} className="text-xs border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-semibold text-gray-900">{log.user.name} <span className="text-gray-400 font-normal">({log.user.role})</span></span>
                                                    <span className="text-gray-400">{formatDateInIndia(log.createdAt)}</span>
                                                </div>
                                                <p className="text-gray-600 leading-relaxed">{log.details}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-gray-400 flex flex-col items-center justify-center h-full">
                                            <span className="text-xs italic">No remarks found.</span>
                                        </div>
                                    )}
                                </div>
                            </div>


                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Update Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}
                                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white transition-all text-sm"
                                >
                                    {currentUserRole === 'FINANCE' ? (
                                        <>
                                            <option value={formData.status}>{formData.status.replace('_', ' ')}</option>
                                            <option value="HANDOFF_TO_OPS">Handoff to Ops</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="NEW">New</option>
                                            <option value="FOLLOW_UP">Follow Up</option>
                                            <option value="INTERESTED">Interested</option>
                                            <option value="IN_PROGRESS">In Progress (Send to Finance)</option>
                                            <option value="DEAL_CLOSED">Deal Closed</option>
                                            <option value="LOST">Lost</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            {/* Conditional Finance Handoff Fields */}
                            {formData.status === "IN_PROGRESS" && (
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                        Finance Handoff Details
                                    </h4>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-blue-900">Assign Finance Member</label>
                                        <select
                                            value={formData.financeUserId || ""}
                                            onChange={(e) => setFormData(p => ({ ...p, financeUserId: e.target.value }))}
                                            className="w-full p-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                                        >
                                            <option value="">Select Finance User...</option>
                                            {users.filter(u => u.role === 'FINANCE').map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-blue-900">Payment Terms / Remarks</label>
                                        <textarea
                                            value={formData.remark || ""}
                                            onChange={(e) => setFormData(p => ({ ...p, remark: e.target.value }))}
                                            className="w-full p-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20 text-sm resize-none bg-white"
                                            placeholder="e.g. 50% Advance received, sent via NEFT..."
                                        />
                                    </div>
                                    <p className="text-xs text-blue-600/80">
                                        Saving will explicitly assign this lead to the selected Finance member.
                                    </p>
                                </div>
                            )}

                            {/* Hide standard notes if IN_PROGRESS to avoid confusion, or keep them? Keeping for now but focusing on Remark */}
                            {formData.status !== "IN_PROGRESS" && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">Remarks / Notes</label>
                                    <textarea
                                        value={formData.notes || ""}
                                        onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none h-32 text-sm resize-none bg-gray-50/30 focus:bg-white transition-all"
                                        placeholder="Add notes about the client or requirements..."
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Base Quote / Price (₹)</label>
                                <input
                                    type="number"
                                    value={formData.baseTotal}
                                    onChange={(e) => setFormData(p => ({ ...p, baseTotal: e.target.value }))}
                                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-gray-50/30 focus:bg-white transition-all font-mono"
                                    placeholder="0"
                                />
                                <p className="text-xs text-gray-400">Set the initial quote amount before applying discounts.</p>
                            </div>
                        </div>
                        <div className="bg-gray-50/50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
                            <button
                                onClick={() => setIsEditOpen(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={updating}
                                className="px-5 py-2 bg-[#002147] text-white rounded-lg font-medium hover:bg-blue-900 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 text-sm shadow-sm transition-all active:scale-95"
                            >
                                {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Modal (Admin Only) */}
            {isAssignOpen && selectedLead && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-lg text-gray-900">Assign Lead</h3>
                            <button onClick={() => setIsAssignOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">×</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-500">
                                Assign <span className="font-semibold text-gray-900">"{selectedLead.customerName}"</span> to a team member.
                            </p>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Select User</label>
                                <select
                                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                                    value={targetAssigneeId}
                                    onChange={(e) => setTargetAssigneeId(e.target.value)}
                                >
                                    <option value="">Choose a user...</option>
                                    {users.filter(u => u.role === 'SALES' || u.role === 'OPERATIONS').map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.name} ({user.role})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="bg-gray-50/50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
                            <button
                                onClick={() => setIsAssignOpen(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssignSave}
                                disabled={updating || !targetAssigneeId}
                                className="px-5 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 text-sm shadow-sm transition-all active:scale-95"
                            >
                                {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                                Assign User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
