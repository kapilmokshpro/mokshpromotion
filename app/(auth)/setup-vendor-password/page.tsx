"use client"

import { Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function SetupVendorPasswordForm() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const vendorId = useMemo(() => searchParams.get("vendorId") || "", [searchParams])
    const email = useMemo(() => searchParams.get("email") || "", [searchParams])
    const token = useMemo(() => searchParams.get("token") || "", [searchParams])

    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [loading, setLoading] = useState(false)

    const isLinkValid = vendorId && email && token

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess("")

        if (password.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        setLoading(true)
        try {
            const res = await fetch("/api/vendor-invite/accept", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vendorId,
                    email,
                    token,
                    password
                })
            })

            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || "Unable to set password")
            }

            setSuccess("Password set successfully. Redirecting to login...")
            setTimeout(() => {
                router.push("/login")
            }, 1200)
        } catch (err: any) {
            setError(err.message || "Unable to set password")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h1 className="text-xl font-bold text-gray-900">Vendor Password Setup</h1>
                <p className="text-sm text-gray-500 mt-1">Create your password to access vendor dashboard.</p>

                {!isLinkValid ? (
                    <div className="mt-6 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">
                        Invalid invite link. Please contact admin.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                value={email}
                                disabled
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                placeholder="At least 6 characters"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                required
                            />
                        </div>
                        {error && (
                            <div className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
                        )}
                        {success && (
                            <div className="rounded-md bg-green-50 text-green-700 px-3 py-2 text-sm">{success}</div>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md px-4 py-2 disabled:opacity-50"
                        >
                            {loading ? "Setting password..." : "Set Password"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}

export default function SetupVendorPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <SetupVendorPasswordForm />
        </Suspense>
    )
}
