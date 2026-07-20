"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle2, XCircle, Shield, ShoppingCart } from "lucide-react"
import { toast } from "sonner"

export default function DiscountInquiryReviewPage() {
    const params = useParams()!;
    const searchParams = useSearchParams()!
    const id = params.id as string
    const token = searchParams.get("token")
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [inquiry, setInquiry] = useState<any>(null)
    const [otp, setOtp] = useState("")
    const [discount, setDiscount] = useState<string>("")
    const [actionLoading, setActionLoading] = useState(false)
    const [status, setStatus] = useState<string>("PENDING")
    const [processed, setProcessed] = useState(false)
    const [resultData, setResultData] = useState<any>(null)

    useEffect(() => {
        if (!token) {
            toast.error("Invalid or missing token")
            setLoading(false)
            return
        }
        fetchInquiry()
    }, [id, token])

    const fetchInquiry = async () => {
        try {
            const res = await fetch(`/api/discount-inquiry-review/${id}?token=${token}`)
            if (!res.ok) {
                const error = await res.text()
                throw new Error(error || "Failed to fetch inquiry")
            }
            const data = await res.json()
            setInquiry(data.inquiry)
            setStatus(data.inquiry.status)
            setDiscount(data.inquiry.discountPercent?.toString() || "")
            if (data.inquiry.status !== "PENDING") {
                setResultData({
                    discountPercent: data.inquiry.discountPercent,
                    finalTotal: data.inquiry.finalTotal
                })
                setProcessed(true)
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to load inquiry")
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async (action: "APPROVE" | "REJECT") => {
        if (action === "APPROVE") {
            if (!otp || otp.length < 4) {
                toast.error("Please enter the OTP from your email")
                return
            }
            if (!discount) {
                toast.error("Please enter an approved discount percentage")
                return
            }
        }

        setActionLoading(true)
        try {
            const res = await fetch("/api/discount-inquiry-review/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    inquiryId: id,
                    token,
                    otp,
                    discountPercent: discount,
                    action
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Action failed")

            // Update local inquiry state with new values
            if (action === "APPROVE") {
                setInquiry((prev: any) => ({
                    ...prev,
                    status: "APPROVED",
                    discountPercent: data.discountPercent,
                    discountAmount: data.discountAmount,
                    finalTotal: data.finalTotal
                }))
                setResultData({
                    discountPercent: data.discountPercent,
                    finalTotal: data.finalTotal
                })
            } else {
                setInquiry((prev: any) => ({ ...prev, status: "REJECTED" }))
            }

            setStatus(data.status)
            setProcessed(true)
            toast.success(action === "APPROVE" ? "Inquiry Approved Successfully" : "Inquiry Rejected")
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50/50">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-[#002147] mx-auto" />
                    <p className="text-gray-500 font-medium animate-pulse">Loading secure review session...</p>
                </div>
            </div>
        )
    }

    if (!inquiry) {
        return (
            <div className="container max-w-2xl mx-auto py-12 px-4">
                <Alert variant="destructive" className="border-2">
                    <XCircle className="h-5 w-5" />
                    <AlertDescription className="font-semibold ml-2">Secure inquiry not found or review token has expired.</AlertDescription>
                </Alert>
            </div>
        )
    }

    const items = JSON.parse(inquiry.cartSnapshot || "[]")

    if (processed) {
        return (
            <div className="container max-w-2xl mx-auto py-12 px-4 animate-in fade-in zoom-in duration-500">
                <Card className="border-2 shadow-xl overflow-hidden">
                    <div className={`h-2 ${status === 'APPROVED' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <CardHeader className="text-center pb-8 pt-10">
                        {status === "APPROVED" ? (
                            <>
                                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                                </div>
                                <CardTitle className="text-3xl font-extrabold text-gray-900 mb-2">Inquiry Approved!</CardTitle>
                                <CardDescription className="text-lg">
                                    The campaign discount has been authorized and the client notified.
                                </CardDescription>
                                <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-100 shadow-inner">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-gray-500 font-medium">Approved Discount</span>
                                        <Badge className="bg-green-600 text-lg px-4 py-1">{resultData?.discountPercent}% OFF</Badge>
                                    </div>
                                    <Separator className="my-4" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 font-medium">Final Agreement Value</span>
                                        <span className="text-2xl font-bold text-[#002147]">₹{Number(resultData?.finalTotal).toLocaleString("en-IN")}</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <XCircle className="h-12 w-12 text-red-600" />
                                </div>
                                <CardTitle className="text-3xl font-extrabold text-gray-900 mb-2">Inquiry Rejected</CardTitle>
                                <CardDescription className="text-lg">
                                    This discount inquiry has been marked as rejected.
                                </CardDescription>
                            </>
                        )}
                        <div className="pt-8">
                            <Button variant="outline" onClick={() => window.close()} className="border-gray-300">
                                Close Window
                            </Button>
                        </div>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8fbff] pb-12">
            {/* Header / Navbar Branding */}
            <div className="bg-[#002147] text-white py-6 mb-8 shadow-md">
                <div className="container max-w-6xl mx-auto px-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">MOKSH PROMOTION</h1>
                        <p className="text-blue-200 text-xs">Internal Discount Approval System</p>
                    </div>
                    <Badge variant="outline" className="text-blue-100 border-blue-400 bg-blue-900/40 px-3 py-1">
                        Secure Admin Link
                    </Badge>
                </div>
            </div>

            <div className="container max-w-6xl mx-auto px-4">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold mb-2 text-gray-900">Campaign Review</h2>
                    <p className="text-muted-foreground">
                        Please verify the campaign volume and client details before authorizing a discount.
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Inquiry Details */}
                        <Card className="border-none shadow-sm ring-1 ring-gray-200 overflow-hidden">
                            <CardHeader className="bg-white border-b py-4">
                                <CardTitle className="text-lg font-bold flex items-center gap-2 text-[#002147]">
                                    <div className="w-1.5 h-6 bg-[#E31E24] rounded-full mr-1" />
                                    📋 Client Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-3 gap-6 p-6">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Client Name</Label>
                                    <p className="font-bold text-gray-900">{inquiry.clientName}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</Label>
                                    <p className="font-medium text-gray-700">{inquiry.clientEmail}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phone / WhatsApp</Label>
                                    <p className="font-medium text-gray-700">{inquiry.clientPhone || "No Number Provided"}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Company</Label>
                                    <p className="font-medium text-gray-700">{inquiry.companyName || "Personal/N/A"}</p>
                                </div>
                                <div className="md:col-span-2 space-y-1 bg-orange-50/50 p-3 rounded-lg border border-orange-100">
                                    <Label className="text-xs font-bold text-orange-600 uppercase tracking-wider">Expected Discount / Client Notes</Label>
                                    <p className="text-gray-800 italic text-sm">"{inquiry.notes || "No additional notes provided"}"</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Cart Items - Detailed */}
                        <Card className="border-none shadow-sm ring-1 ring-gray-200 overflow-hidden text-[#002147]">
                            <CardHeader className="bg-white border-b py-4">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-[#E31E24] rounded-full mr-1" />
                                    <ShoppingCart className="h-5 w-5 text-gray-400" />
                                    Campion Inventory Details ({items.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/80 border-b">
                                                <th className="px-5 py-3 font-semibold text-gray-600">Inventory Details</th>
                                                <th className="px-4 py-3 font-semibold text-gray-600">Location</th>
                                                <th className="px-4 py-3 font-semibold text-gray-600">Dimensions</th>
                                                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Rate</th>
                                                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Net Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {items.map((item: any, i: number) => (
                                                <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                                                    <td className="px-5 py-4">
                                                        <div className="font-bold text-[#002147] mb-0.5">{item.outletName || item.name}</div>
                                                        <div className="flex gap-2">
                                                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-medium border-gray-200">{item.state}</Badge>
                                                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-medium border-gray-200">{item.district}</Badge>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="text-xs text-gray-500 max-w-[150px] leading-relaxed">
                                                            {item.locationName || item.location}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-xs font-[#002147]">
                                                        <span className="font-bold">{item.widthFt || item.width}' x {item.heightFt || item.height}'</span>
                                                        <div className="text-gray-400 text-[10px] font-bold">{item.areaSqft || item.totalArea} sqft</div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <div className="text-gray-500 font-bold">₹{Number(item.ratePerSqft || item.rate).toLocaleString('en-IN')}</div>
                                                        {Number(item.printingCharge) > 0 && (
                                                            <div className="text-[10px] text-gray-400 font-bold">+₹{Number(item.printingCharge).toLocaleString('en-IN')} print</div>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4 text-right font-bold text-gray-900">
                                                        ₹{Number(item.netTotal).toLocaleString('en-IN')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="bg-gray-50 px-6 py-6 border-t flex flex-col items-end">
                                    <div className="flex justify-between w-full max-w-xs mb-1">
                                        <span className="text-gray-500 font-medium font-bold">Gross Subtotal:</span>
                                        <span className="text-gray-900 font-bold">₹{Number(inquiry.baseTotal).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between w-full max-w-xs mt-4 pt-4 border-t border-gray-200">
                                        <span className="text-gray-900 font-extrabold text-lg uppercase tracking-tight">Base Total:</span>
                                        <span className="text-2xl font-black text-[#002147]">₹{Number(inquiry.baseTotal).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-8">
                        {/* Action Card */}
                        <Card className="border-2 border-[#002147]/20 shadow-xl overflow-hidden sticky top-8">
                            <CardHeader className="bg-[#002147] text-white py-5">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-blue-400" />
                                    Authorization Required
                                </CardTitle>
                                <CardDescription className="text-blue-200">
                                    Verify OTP and set approved percentage
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-8 space-y-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <Label htmlFor="discount" className="text-xs font-black uppercase text-gray-500">Approved Discount %</Label>
                                        {inquiry.requestedDiscount && (
                                            <span className="text-[10px] font-bold text-[#E31E24] bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                                Expected: {inquiry.requestedDiscount}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2 relative">
                                        <Input
                                            id="discount"
                                            type="number"
                                            value={discount}
                                            onChange={(e) => setDiscount(e.target.value)}
                                            placeholder="Enter %"
                                            className="text-2xl font-black h-16 border-2 focus:ring-[#002147] focus:border-[#002147] pl-4 pr-12"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">%</div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="otp" className="text-xs font-black uppercase text-gray-500">Security OTP (from email)</Label>
                                    <Input
                                        id="otp"
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                        placeholder="000 000"
                                        maxLength={6}
                                        className="text-center text-3xl h-16 tracking-[0.2em] font-black border-2 bg-gray-50 focus:bg-white transition-colors"
                                    />
                                    <div className="flex items-center justify-center gap-1.5 bg-blue-50 py-2 rounded text-[10px] font-bold text-blue-700 border border-blue-100">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                                        Valid for 10 minutes from receipt
                                    </div>
                                </div>

                                {discount && !isNaN(Number(discount)) && (
                                    <div className="bg-[#002147] p-4 rounded-xl text-white shadow-lg animate-in slide-in-from-top-4 duration-300">
                                        <div className="flex justify-between text-xs text-blue-200 mb-1">
                                            <span>After {discount}% Discount:</span>
                                            <span className="line-through">₹{Number(inquiry.baseTotal).toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-lg font-black font-bold">
                                            <span>New Total:</span>
                                            <span className="text-white">₹{(Number(inquiry.baseTotal) * (1 - Number(discount) / 100)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                        </div>
                                    </div>
                                )}

                                <Separator />

                                <div className="flex flex-col gap-4">
                                    <Button
                                        onClick={() => handleAction("APPROVE")}
                                        disabled={actionLoading || !otp || !discount}
                                        className="w-full bg-[#E31E24] hover:bg-[#c4151a] h-14 text-lg font-bold shadow-lg shadow-red-200 transition-all active:scale-95 text-white"
                                    >
                                        {actionLoading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                                        VERIFY & AUTHORIZE
                                    </Button>
                                    <Button
                                        onClick={() => handleAction("REJECT")}
                                        disabled={actionLoading}
                                        variant="ghost"
                                        className="w-full text-gray-400 hover:text-red-600 hover:bg-red-50 font-medium"
                                    >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Reject Inquiry
                                    </Button>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-gray-50 border-t py-4">
                                <p className="text-[9px] text-gray-400 text-center w-full leading-relaxed">
                                    Authorized approval will generate a final quote and notify both sales and client via email.
                                </p>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
