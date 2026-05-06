"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type VendorRow = {
    id: number
    name: string
    email: string
    phone?: string | null
    vendorProfile?: {
        companyName?: string | null
        phone?: string | null
        isActive: boolean
    } | null
    vendorAssignments: Array<{ id: string; status: string }>
    createdAt: string
}

export default function VendorsAdminClient({ initialVendors }: { initialVendors: VendorRow[] }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        companyName: "",
        isActive: true
    })

    const createVendor = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)
        try {
            const res = await fetch("/api/admin/vendors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            })
            if (!res.ok) {
                throw new Error((await res.text()) || "Failed to create vendor")
            }
            setForm({ name: "", email: "", phone: "", companyName: "", isActive: true })
            router.refresh()
        } catch (err: any) {
            setError(err.message || "Failed to create vendor")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
                <p className="text-sm text-gray-500 mt-1">Create vendors and send secure invite links.</p>
            </div>

            <form onSubmit={createVendor} className="bg-white border border-gray-200 rounded-xl p-4 grid gap-3 md:grid-cols-2">
                <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Vendor name"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    required
                />
                <input
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Vendor email"
                    type="email"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    required
                />
                <input
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone (optional)"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                    value={form.companyName}
                    onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Company name (optional)"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    />
                    Active vendor
                </label>
                <div className="md:col-span-2 flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-md disabled:opacity-50"
                    >
                        {loading ? "Creating..." : "Create Vendor"}
                    </button>
                    {error && <span className="text-sm text-red-600">{error}</span>}
                </div>
            </form>

            <div className="md:hidden space-y-3">
                {initialVendors.map((vendor) => (
                    <div key={vendor.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                        <div className="text-sm font-semibold text-gray-900">{vendor.name}</div>
                        <div className="text-xs text-gray-500 break-all">{vendor.email}</div>
                        <div className="text-xs text-gray-600">Company: {vendor.vendorProfile?.companyName || "-"}</div>
                        <div className="text-xs text-gray-600">Assignments: {vendor.vendorAssignments.length}</div>
                        <span className={`inline-flex text-[10px] px-2 py-1 rounded-full ${vendor.vendorProfile?.isActive !== false ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                            {vendor.vendorProfile?.isActive !== false ? "ACTIVE" : "INACTIVE"}
                        </span>
                    </div>
                ))}
                {initialVendors.length === 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500">
                        No vendors yet.
                    </div>
                )}
            </div>

            <div className="hidden md:block bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Company</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Assignments</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {initialVendors.map((vendor) => (
                            <tr key={vendor.id}>
                                <td className="px-4 py-3">
                                    <div className="text-sm font-semibold text-gray-900">{vendor.name}</div>
                                    <div className="text-xs text-gray-500">{vendor.email}</div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">{vendor.vendorProfile?.companyName || "-"}</td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs px-2 py-1 rounded-full ${vendor.vendorProfile?.isActive !== false ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                                        {vendor.vendorProfile?.isActive !== false ? "ACTIVE" : "INACTIVE"}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">{vendor.vendorAssignments.length}</td>
                            </tr>
                        ))}
                        {initialVendors.length === 0 && (
                            <tr>
                                <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={4}>No vendors yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    )
}
