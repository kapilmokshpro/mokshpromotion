"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"

type VendorOption = {
    id: number
    name: string
    email: string
}

type SiteOption = {
    id: number
    inventoryCode?: string | null
    outletName: string
    locationName: string
    city?: string | null
    district?: string | null
    state?: string | null
}

type LeadOption = {
    id: number
    customerName: string
}

type AssignmentRow = {
    id: string
    status: string
    notes?: string | null
    createdAt: string
    vendor: { id: number; name: string; email: string }
    inventoryHoarding: SiteOption
    lead?: { id: number; customerName: string; email?: string | null } | null
}

export default function VendorAssignmentsAdminClient(props: {
    vendors: VendorOption[]
    sites: SiteOption[]
    leads: LeadOption[]
    assignments: AssignmentRow[]
}) {
    const router = useRouter()
    const [vendorId, setVendorId] = useState("")
    const [leadId, setLeadId] = useState("")
    const [notes, setNotes] = useState("")
    const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([])
    const [siteQuery, setSiteQuery] = useState("")
    const [selectedState, setSelectedState] = useState("")
    const [selectedDistrict, setSelectedDistrict] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const states = useMemo(() => {
        const values = new Set(
            props.sites
                .map((site) => (site.state || "").trim())
                .filter((state) => state.length > 0)
        )
        return Array.from(values).sort((a, b) => a.localeCompare(b))
    }, [props.sites])

    const districts = useMemo(() => {
        if (!selectedState) return []
        const values = new Set(
            props.sites
                .filter((site) => (site.state || "").trim() === selectedState)
                .map((site) => (site.district || "").trim())
                .filter((district) => district.length > 0)
        )
        return Array.from(values).sort((a, b) => a.localeCompare(b))
    }, [props.sites, selectedState])

    const filteredSites = useMemo(() => {
        if (!selectedState || !selectedDistrict) return []

        const q = siteQuery.trim().toLowerCase()
        const scopedSites = props.sites.filter((site) => {
            const siteState = (site.state || "").trim()
            const siteDistrict = (site.district || "").trim()
            return siteState === selectedState && siteDistrict === selectedDistrict
        })

        if (!q) return scopedSites

        return scopedSites.filter((site) => {
            const location = [site.locationName, site.city || site.district, site.state].filter(Boolean).join(" ")
            return [site.outletName, site.inventoryCode || "", location].join(" ").toLowerCase().includes(q)
        })
    }, [props.sites, selectedState, selectedDistrict, siteQuery])

    const toggleSite = (siteId: number) => {
        setSelectedSiteIds((prev) =>
            prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]
        )
    }

    const assignSites = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess("")
        if (!vendorId) {
            setError("Select vendor")
            return
        }
        if (selectedSiteIds.length === 0) {
            setError("Select at least one site")
            return
        }

        setLoading(true)
        try {
            const res = await fetch("/api/admin/vendor-assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vendorId: Number(vendorId),
                    inventoryHoardingIds: selectedSiteIds,
                    leadId: leadId ? Number(leadId) : undefined,
                    notes: notes || undefined,
                })
            })
            if (!res.ok) {
                throw new Error((await res.text()) || "Failed to assign sites")
            }

            let payload: { createdCount?: number; skippedCount?: number } | null = null
            try {
                payload = await res.json()
            } catch {
                payload = null
            }

            const createdCount = payload?.createdCount ?? selectedSiteIds.length
            const skippedCount = payload?.skippedCount ?? 0
            const successMessage =
                skippedCount > 0
                    ? `${createdCount} site(s) assigned successfully. ${skippedCount} already-open assignment(s) skipped.`
                    : `${createdCount} site(s) assigned successfully.`

            setSuccess(successMessage)
            toast.success(successMessage)
            setSelectedSiteIds([])
            setNotes("")
            setLeadId("")
            router.refresh()
        } catch (err: any) {
            setError(err.message || "Failed to assign sites")
            toast.error(err.message || "Failed to assign sites")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Vendor Site Assignments</h1>
                <p className="text-sm text-gray-500 mt-1">Assign one or more sites to vendor.</p>
            </div>

            <form onSubmit={assignSites} className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select
                        value={vendorId}
                        onChange={(e) => setVendorId(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                        required
                    >
                        <option value="">Select vendor</option>
                        {props.vendors.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>
                                {vendor.name} ({vendor.email})
                            </option>
                        ))}
                    </select>

                    <select
                        value={leadId}
                        onChange={(e) => setLeadId(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                        <option value="">Link to lead (optional)</option>
                        {props.leads.map((lead) => (
                            <option key={lead.id} value={lead.id}>
                                #{lead.id} - {lead.customerName}
                            </option>
                        ))}
                    </select>

                    <input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Assignment notes (optional)"
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                        value={selectedState}
                        onChange={(e) => {
                            const value = e.target.value
                            setSelectedState(value)
                            setSelectedDistrict("")
                            setSiteQuery("")
                        }}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                        <option value="">Select state</option>
                        {states.map((state) => (
                            <option key={state} value={state}>
                                {state}
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedDistrict}
                        onChange={(e) => {
                            setSelectedDistrict(e.target.value)
                            setSiteQuery("")
                        }}
                        disabled={!selectedState}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                    >
                        <option value="">Select district</option>
                        {districts.map((district) => (
                            <option key={district} value={district}>
                                {district}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <input
                        value={siteQuery}
                        onChange={(e) => setSiteQuery(e.target.value)}
                        placeholder="Search sites by name, site ID, location"
                        disabled={!selectedState || !selectedDistrict}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        {!selectedState
                            ? "Step 1: Select a state"
                            : !selectedDistrict
                                ? "Step 2: Select a district"
                                : `Showing ${filteredSites.length} site(s) in ${selectedDistrict}, ${selectedState}. Selected: ${selectedSiteIds.length}`}
                    </p>
                </div>

                <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1">
                    {!selectedState || !selectedDistrict ? (
                        <div className="p-3 text-sm text-gray-500">Select state and district to load sites.</div>
                    ) : filteredSites.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">No sites found for the selected filters.</div>
                    ) : (
                        filteredSites.map((site) => (
                            <label key={site.id} className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 text-sm">
                                <input
                                    type="checkbox"
                                    checked={selectedSiteIds.includes(site.id)}
                                    onChange={() => toggleSite(site.id)}
                                />
                                <span>
                                    <span className="font-medium text-gray-900">{site.outletName}</span>
                                    <span className="text-gray-500"> ({site.inventoryCode || "-"})</span>
                                    <br />
                                    <span className="text-xs text-gray-500">
                                        {[site.locationName, site.city || site.district, site.state].filter(Boolean).join(", ")}
                                    </span>
                                </span>
                            </label>
                        ))
                    )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-md disabled:opacity-50"
                    >
                        {loading ? "Assigning..." : "Assign Sites"}
                    </button>
                    {error && <span className="text-sm text-red-600">{error}</span>}
                </div>
                {success && <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>}
            </form>

            <div className="md:hidden space-y-3">
                {props.assignments.map((item) => (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-1">
                        <div className="text-sm font-semibold text-gray-900">{item.inventoryHoarding.outletName}</div>
                        <div className="text-xs text-gray-600">Vendor: {item.vendor.name}</div>
                        <div className="text-xs text-gray-600">Lead: {item.lead?.customerName || "-"}</div>
                        <div className="text-xs text-gray-600">Status: {item.status}</div>
                    </div>
                ))}
                {props.assignments.length === 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500">
                        No assignments found.
                    </div>
                )}
            </div>

            <div className="hidden md:block bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Site</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lead</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {props.assignments.map((item) => (
                            <tr key={item.id}>
                                <td className="px-4 py-3 text-sm text-gray-800">{item.vendor.name}</td>
                                <td className="px-4 py-3">
                                    <div className="text-sm font-medium text-gray-900">{item.inventoryHoarding.outletName}</div>
                                    <div className="text-xs text-gray-500">{item.inventoryHoarding.inventoryCode || "-"}</div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">{item.lead?.customerName || "-"}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{item.status}</td>
                            </tr>
                        ))}
                        {props.assignments.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
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
