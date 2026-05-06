"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

type AssignmentRow = {
    id: string
    status: string
    notes?: string | null
    createdAt: string
    inventoryHoarding: {
        inventoryCode?: string | null
        outletName: string
        locationName: string
        city?: string | null
        district?: string | null
        state?: string | null
    }
    lead?: {
        customerName: string
    } | null
    proofs: Array<{
        id: string
        status: string
        submittedAt?: string | null
        rejectionReason?: string | null
    }>
}

const statusClasses: Record<string, string> = {
    ASSIGNED_TO_VENDOR: "bg-blue-100 text-blue-800",
    PENDING_VENDOR_UPLOAD: "bg-blue-100 text-blue-800",
    SUBMITTED_FOR_APPROVAL: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    CLIENT_NOTIFIED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    REUPLOAD_REQUESTED: "bg-orange-100 text-orange-800",
}

export default function VendorSitesClient({ assignments }: { assignments: AssignmentRow[] }) {
    const [query, setQuery] = useState("")

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return assignments

        return assignments.filter((item) => {
            const site = item.inventoryHoarding
            const location = [site.locationName, site.city || site.district, site.state].filter(Boolean).join(" ")
            const haystack = [
                site.outletName,
                site.inventoryCode || "",
                location,
                item.lead?.customerName || "",
            ].join(" ").toLowerCase()
            return haystack.includes(q)
        })
    }, [assignments, query])

    return (
        <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                <h1 className="text-2xl font-bold text-gray-900">My Assigned Sites</h1>
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by site name, site ID, location, campaign/client"
                    className="w-full md:w-[420px] rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
            </div>

            <div className="md:hidden space-y-3">
                {filtered.map((item) => {
                    const site = item.inventoryHoarding
                    const location = [site.locationName, site.city || site.district, site.state].filter(Boolean).join(", ")
                    const statusClass = statusClasses[item.status] || "bg-gray-100 text-gray-700"

                    return (
                        <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="text-sm font-semibold text-gray-900">{site.outletName}</div>
                                    <div className="text-xs text-gray-500">ID: {site.inventoryCode || "-"}</div>
                                </div>
                                <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${statusClass}`}>
                                    {item.status}
                                </span>
                            </div>
                            <div className="text-xs text-gray-600">{location || "-"}</div>
                            <div className="text-xs text-gray-600">Campaign: {item.lead?.customerName || "-"}</div>
                            <Link
                                href={`/dashboard/vendor/sites/${item.id}`}
                                className="inline-block text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Open
                            </Link>
                        </div>
                    )
                })}
                {filtered.length === 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
                        No assignments found.
                    </div>
                )}
            </div>

            <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Site</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Campaign</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.map((item) => {
                            const site = item.inventoryHoarding
                            const location = [site.locationName, site.city || site.district, site.state].filter(Boolean).join(", ")
                            const statusClass = statusClasses[item.status] || "bg-gray-100 text-gray-700"

                            return (
                                <tr key={item.id}>
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-semibold text-gray-900">{site.outletName}</div>
                                        <div className="text-xs text-gray-500">ID: {site.inventoryCode || "-"}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{location || "-"}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{item.lead?.customerName || "-"}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusClass}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Link
                                            href={`/dashboard/vendor/sites/${item.id}`}
                                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            Open
                                        </Link>
                                    </td>
                                </tr>
                            )
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                                    No assignments found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    )
}
