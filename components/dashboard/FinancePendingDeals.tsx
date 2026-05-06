"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "./DashboardComponents"
import { FileText, Phone, User, ArrowUpRight, Loader2, ArrowRight } from "lucide-react"
import { formatDateInIndia } from "@/lib/utils"

interface Lead {
    id: number
    customerName: string
    phone: string
    email: string | null
    status: string
    updatedAt: Date
    assignee: { name: string } | null
    salesUser?: { name: string } | null
    financeUser?: { name: string } | null
    opsUser?: { name: string } | null
    logs?: any[]
}

interface User {
    id: number
    name: string
    role: string
}

export default function FinancePendingDeals({ deals, opsUsers }: { deals: any[], opsUsers: User[] }) {
    const router = useRouter()
    const [selectedDeal, setSelectedDeal] = useState<Lead | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // ... (rest of state identical) ...
    const [formData, setFormData] = useState({
        opsUserId: "",
        remark: ""
    })

    const handleDealClick = (deal: any) => {
        setSelectedDeal(deal)
        setFormData({ opsUserId: "", remark: "" })
        setIsModalOpen(true)
    }

    // ... handleHandoff same ...

    const handleHandoff = async () => {
        if (!selectedDeal || !formData.opsUserId) return

        setLoading(true)
        try {
            const res = await fetch(`/api/leads/${selectedDeal.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    opsUserId: Number(formData.opsUserId),
                    remark: formData.remark,
                    status: "HANDOFF_TO_OPS" // Explicit status update
                })
            })

            if (!res.ok) throw new Error("Failed to handoff")

            router.refresh()
            setIsModalOpen(false)
        } catch (error) {
            console.error(error)
            alert("Failed to assign to Ops")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            {/* ... Header and List Same ... */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Pending Sales Deals
                </h2>
                <span className="text-sm text-gray-500">{deals.length} deals</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden h-[400px] overflow-y-auto">
                {deals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <FileText className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-sm">No pending deals</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {deals.map((deal) => (
                            <div
                                key={deal.id}
                                onClick={() => router.push(`/dashboard/sales/leads/${deal.id}`)}
                                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-semibold text-gray-900 text-sm group-hover:text-blue-700">{deal.customerName}</h4>
                                    <Badge variant="warning">Action Required</Badge>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                                    <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {deal.salesUser?.name || 'Unknown Sales'}
                                    </span>
                                    <span className="text-gray-300">|</span>
                                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {deal.phone}</span>
                                </div>
                                <div className="text-xs text-gray-400 flex justify-between items-center">
                                    <span>Referral Date: {formatDateInIndia(deal.updatedAt)}</span>
                                    <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Handoff Modal */}
            {isModalOpen && selectedDeal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-lg text-gray-900">Process Deal & Handoff</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">×</button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                                <h4 className="text-sm font-bold text-blue-900 mb-1">{selectedDeal.customerName}</h4>
                                <p className="text-xs text-blue-700">Ensure payment has been verified before handing off to Operations.</p>
                            </div>

                            {/* Team Details Section */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs border-b border-gray-100 pb-4">
                                <div className="space-y-1">
                                    <p className="text-gray-500 font-medium">Sales Rep</p>
                                    <p className="font-semibold text-gray-900 flex items-center gap-1">
                                        <User className="w-3 h-3 text-blue-500" />
                                        {selectedDeal.salesUser?.name || '-'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-gray-500 font-medium">Finance</p>
                                    <p className="font-semibold text-gray-900 flex items-center gap-1">
                                        <User className="w-3 h-3 text-green-500" />
                                        {selectedDeal.financeUser?.name || 'Assigning...'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-gray-500 font-medium">Operations</p>
                                    <p className="font-semibold text-gray-900 flex items-center gap-1">
                                        <User className="w-3 h-3 text-purple-500" />
                                        {selectedDeal.opsUser?.name || 'To Assign'}
                                    </p>
                                </div>
                            </div>

                            {/* Previous Remarks Section */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Previous Remarks / History</label>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 h-32 overflow-y-auto space-y-3">
                                    {/* Type guard to check if logs exist on the selectedDeal */}
                                    {(selectedDeal as any).logs && (selectedDeal as any).logs.length > 0 ? (
                                        (selectedDeal as any).logs.map((log: any) => (
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
                                            <span className="text-xs italic">No previous remarks found.</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Assign Operations Manager</label>
                                <select
                                    value={formData.opsUserId}
                                    onChange={(e) => setFormData(p => ({ ...p, opsUserId: e.target.value }))}
                                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                                >
                                    <option value="">Select Ops Member...</option>
                                    {opsUsers.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">Handoff Remarks</label>
                                <textarea
                                    value={formData.remark}
                                    onChange={(e) => setFormData(p => ({ ...p, remark: e.target.value }))}
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 text-sm resize-none bg-white"
                                    placeholder="Confirm payment receipt, specific instructions for Ops..."
                                />
                            </div>
                        </div>
                        <div className="bg-gray-50/50 px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-gray-100">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-full sm:w-auto px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleHandoff}
                                disabled={loading || !formData.opsUserId}
                                className="w-full sm:w-auto px-5 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-sm transition-all active:scale-95"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Mark Paid & Assign Ops <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
