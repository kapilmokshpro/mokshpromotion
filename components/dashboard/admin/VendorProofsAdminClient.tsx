"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type ProofRow = {
    id: string
    status: string
    submittedAt?: string | null
    latitude: number
    longitude: number
    accuracy?: number | null
    rejectionReason?: string | null
    vendor: {
        id: number
        name: string
        email: string
    }
    assignment: {
        id: string
        status: string
        lead?: {
            id: number
            customerName: string
            email?: string | null
        } | null
    }
    inventoryHoarding: {
        id: number
        inventoryCode?: string | null
        outletName: string
        locationName: string
        city?: string | null
        district?: string | null
        state?: string | null
    }
    media: Array<{
        id: string
        type: "PHOTO" | "VIDEO"
        url: string
        fileName: string
    }>
}

export default function VendorProofsAdminClient({ proofs }: { proofs: ProofRow[] }) {
    const router = useRouter()
    const [loadingId, setLoadingId] = useState("")
    const [error, setError] = useState("")

    const approveProof = async (proofId: string) => {
        setError("")
        setLoadingId(proofId)
        try {
            const res = await fetch(`/api/admin/vendor-proofs/${proofId}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notifyClient: true })
            })
            if (!res.ok) throw new Error((await res.text()) || "Approve failed")
            const data = await res.json()
            if (data.warning) {
                setError(data.warning)
            }
            router.refresh()
        } catch (err: any) {
            setError(err.message || "Approve failed")
        } finally {
            setLoadingId("")
        }
    }

    const rejectProof = async (proofId: string) => {
        const reason = window.prompt("Enter rejection reason for re-upload:")
        if (!reason) return

        setError("")
        setLoadingId(proofId)
        try {
            const res = await fetch(`/api/admin/vendor-proofs/${proofId}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason })
            })
            if (!res.ok) throw new Error((await res.text()) || "Reject failed")
            router.refresh()
        } catch (err: any) {
            setError(err.message || "Reject failed")
        } finally {
            setLoadingId("")
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Vendor Proof Review</h1>
                <p className="text-sm text-gray-500 mt-1">Review uploaded site proofs, verify GPS, approve/reject.</p>
            </div>

            {error && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-3 py-2 text-sm">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                {proofs.map((proof) => {
                    const site = proof.inventoryHoarding
                    const location = [site.locationName, site.city || site.district, site.state].filter(Boolean).join(", ")
                    const isPending = proof.status === "SUBMITTED_FOR_APPROVAL"

                    return (
                        <div key={proof.id} className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="flex flex-wrap justify-between gap-3">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{site.outletName}</h3>
                                    <p className="text-sm text-gray-600">Site ID: {site.inventoryCode || "-"}</p>
                                    <p className="text-sm text-gray-600">Vendor: {proof.vendor.name} ({proof.vendor.email})</p>
                                    <p className="text-sm text-gray-600">Campaign/Client: {proof.assignment.lead?.customerName || "-"}</p>
                                    <p className="text-sm text-gray-600">Location: {location || "-"}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                        proof.status === "APPROVED" ? "bg-green-100 text-green-800" :
                                        proof.status === "REJECTED" ? "bg-red-100 text-red-800" :
                                        "bg-yellow-100 text-yellow-800"
                                    }`}>
                                        {proof.status}
                                    </span>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Submitted: {proof.submittedAt ? new Date(proof.submittedAt).toLocaleString("en-IN") : "-"}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 text-sm text-gray-700">
                                GPS: {Number(proof.latitude).toFixed(6)}, {Number(proof.longitude).toFixed(6)}
                                {proof.accuracy ? ` (accuracy ${Number(proof.accuracy).toFixed(2)}m)` : ""}
                                {" "}
                                <a
                                    className="text-blue-600 hover:text-blue-800"
                                    href={`https://maps.google.com/?q=${proof.latitude},${proof.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Open Map
                                </a>
                            </div>

                            {proof.rejectionReason && (
                                <div className="mt-2 text-sm text-red-700">
                                    Rejection reason: {proof.rejectionReason}
                                </div>
                            )}

                            <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
                                {proof.media.map((media) => (
                                    <div key={media.id} className="border border-gray-200 rounded-md overflow-hidden bg-gray-50">
                                        {media.type === "PHOTO" ? (
                                            <img src={media.url} alt={media.fileName} className="w-full h-28 object-cover" />
                                        ) : (
                                            <video src={media.url} controls className="w-full h-28 object-cover" />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {isPending && (
                                <div className="mt-4 flex items-center gap-3">
                                    <button
                                        onClick={() => approveProof(proof.id)}
                                        disabled={loadingId === proof.id}
                                        className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-md disabled:opacity-50"
                                    >
                                        {loadingId === proof.id ? "Processing..." : "Approve"}
                                    </button>
                                    <button
                                        onClick={() => rejectProof(proof.id)}
                                        disabled={loadingId === proof.id}
                                        className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-md disabled:opacity-50"
                                    >
                                        Reject / Re-upload
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                })}

                {proofs.length === 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-sm text-gray-500">
                        No proofs found.
                    </div>
                )}
            </div>
        </div>
    )
}

