
"use client"
import { useState } from "react"
import { useCart } from "@/context/CartContext"
import { X, CheckCircle, Loader2 } from "lucide-react"

import { useRouter } from "next/navigation"

interface QuoteModalProps {
    isOpen: boolean
    onClose: () => void
    serviceInterest?: string
}

export default function QuoteModal({ isOpen, onClose, serviceInterest }: QuoteModalProps) {
    const router = useRouter()
    const { cartItems, clearCart } = useCart()
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const [warningMessage, setWarningMessage] = useState("")
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        city: "",
        notes: "",
    })

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMessage("")
        setWarningMessage("")

        try {
            const res = await fetch("/api/quote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    items: cartItems,
                    serviceInterest
                })
            })

            const payload = await res.json().catch(() => null)
            if (!res.ok) {
                throw new Error(payload?.error || "Failed to send quote request.")
            }

            setSuccess(true)
            if (payload?.warning) {
                setWarningMessage(payload.warning)
            }
            if (!serviceInterest) {
                // Only clear cart if it was a cart-based quote
                // clearCart() - Moved to close action
            }
        } catch (error) {
            console.error(error)
            const message = error instanceof Error ? error.message : "Something went wrong. Please try again."
            setErrorMessage(message)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8 text-center animate-in fade-in zoom-in">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h2>
                    <p className="text-gray-600 mb-6">
                        Thanks for your quote request. We will get back to you shortly.
                    </p>
                    {warningMessage && (
                        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-800">
                            {warningMessage}
                        </p>
                    )}
                    <button
                        onClick={() => {
                            if (!serviceInterest) clearCart()
                            onClose()
                            // router.push("/") // Optional: Stay on page for service inquiries?
                            if (serviceInterest) {
                                // For service page, maybe just close modal
                            } else {
                                router.push("/")
                            }
                        }}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium w-full"
                    >
                        {serviceInterest ? "Close" : "Back to Home"}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <div className="border-b px-6 py-4 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-lg text-gray-900">
                        {serviceInterest ? `Enquire: ${serviceInterest}` : "Request a Quote"}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Full Name *</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="John Doe"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Email Address *</label>
                        <input
                            required
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="john@company.com"
                        />
                    </div>

                    <div className="row grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Phone Number *</label>
                            <input
                                required
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                pattern="[0-9+\-() ]{7,20}"
                                maxLength={20}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="+91 98765 43210"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">City *</label>
                            <input
                                required
                                type="text"
                                value={formData.city}
                                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="e.g. Mumbai"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Notes / Requirements</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[88px]"
                            placeholder="Any campaign note, preferred start date, budget, or special instruction..."
                            maxLength={1000}
                        />
                    </div>

                    <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 mt-2">
                        {serviceInterest ? (
                            <span>You are requesting a quote for <strong>{serviceInterest}</strong> services.</span>
                        ) : (
                            <span>You are enquiring for <strong>{cartItems.length} locations</strong>. We will send a confirmation to your email.</span>
                        )}
                    </div>

                    {errorMessage && (
                        <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                            {errorMessage}
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-2.5 rounded hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? "Submitting..." : "Submit Quote Request"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
