"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Mail, Shield } from "lucide-react";
import { toast } from "sonner";

interface DiscountRequestData {
    id: string;
    leadName: string;
    leadPhone: string;
    leadEmail?: string;
    salesRepName: string;
    requestedPercent: number;
    baseTotal: number;
    finalTotal: number;
    reason: string;
    status: string;
    campaignItems: any[];
    createdAt: string;
}

export default function DiscountReviewPage() {
    const params = useParams()!;
    const searchParams = useSearchParams()!;
    const requestId = params.requestId as string;
    const token = searchParams.get("token");

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DiscountRequestData | null>(null);
    const [step, setStep] = useState<"review" | "otp" | "decision">("review");
    const [otp, setOtp] = useState("");
    const [otpLoading, setOtpLoading] = useState(false);
    const [approvedPercent, setApprovedPercent] = useState<number>(0);
    const [rejectionReason, setRejectionReason] = useState("");
    const [decision, setDecision] = useState<"approve" | "reject" | null>(null);

    useEffect(() => {
        if (!token) {
            toast.error("Invalid or missing token");
            return;
        }
        fetchDiscountRequest();
    }, [requestId, token]);

    const fetchDiscountRequest = async () => {
        try {
            const res = await fetch(`/api/discount-review/${requestId}?token=${token}`);
            if (!res.ok) {
                throw new Error("Failed to fetch discount request");
            }
            const result = await res.json();
            setData(result.request);
            setApprovedPercent(result.request.requestedPercent);
        } catch (error) {
            toast.error("Failed to load discount request");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateOTP = async () => {
        setOtpLoading(true);
        try {
            const res = await fetch(`/api/discount-review/${requestId}/generate-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });

            if (!res.ok) {
                const error = await res.text();
                throw new Error(error);
            }

            toast.success("OTP sent to your email");
            setStep("otp");
        } catch (error: any) {
            toast.error(error.message || "Failed to generate OTP");
        } finally {
            setOtpLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!otp || otp.length !== 6) {
            toast.error("Please enter a valid 6-digit OTP");
            return;
        }

        setOtpLoading(true);
        try {
            const res = await fetch(`/api/discount-review/${requestId}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, otp, approvedPercent }),
            });

            if (!res.ok) {
                const error = await res.text();
                throw new Error(error);
            }

            const result = await res.json();
            toast.success("Discount approved successfully!");
            setStep("decision");
            setDecision("approve");
        } catch (error: any) {
            toast.error(error.message || "Failed to approve discount");
        } finally {
            setOtpLoading(false);
        }
    };

    const handleReject = async () => {
        if (!otp || otp.length !== 6) {
            toast.error("Please enter a valid 6-digit OTP");
            return;
        }

        if (!rejectionReason.trim()) {
            toast.error("Please provide a rejection reason");
            return;
        }

        setOtpLoading(true);
        try {
            const res = await fetch(`/api/discount-review/${requestId}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, otp, rejectionReason }),
            });

            if (!res.ok) {
                const error = await res.text();
                throw new Error(error);
            }

            toast.success("Discount request rejected");
            setStep("decision");
            setDecision("reject");
        } catch (error: any) {
            toast.error(error.message || "Failed to reject discount");
        } finally {
            setOtpLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Alert variant="destructive">
                    <AlertDescription>Discount request not found or invalid token</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (step === "decision") {
        return (
            <div className="container max-w-2xl mx-auto py-12 px-4">
                <Card className="border-2">
                    <CardHeader className="text-center">
                        {decision === "approve" ? (
                            <>
                                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                <CardTitle className="text-2xl text-green-600">Discount Approved!</CardTitle>
                                <CardDescription>
                                    The discount has been successfully approved and applied to the lead.
                                </CardDescription>
                            </>
                        ) : (
                            <>
                                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                                <CardTitle className="text-2xl text-red-600">Discount Rejected</CardTitle>
                                <CardDescription>
                                    The discount request has been rejected and the sales rep will be notified.
                                </CardDescription>
                            </>
                        )}
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Discount Approval Review</h1>
                <p className="text-muted-foreground">
                    Review the discount request details and approve or reject with OTP verification
                </p>
            </div>

            <div className="grid gap-4">
                {/* Lead Details Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            📋 Lead Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <Label className="text-muted-foreground">Customer Name</Label>
                                <p className="font-medium">{data.leadName}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Phone</Label>
                                <p className="font-medium">{data.leadPhone}</p>
                            </div>
                            {data.leadEmail && (
                                <div>
                                    <Label className="text-muted-foreground">Email</Label>
                                    <p className="font-medium">{data.leadEmail}</p>
                                </div>
                            )}
                            <div>
                                <Label className="text-muted-foreground">Sales Rep</Label>
                                <p className="font-medium">{data.salesRepName}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Pricing Details Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            💰 Pricing Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Base Price:</span>
                            <span className="text-lg">₹{data.baseTotal.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-red-600">Requested Discount:</span>
                            <Badge variant="destructive" className="text-base">
                                {data.requestedPercent}%
                            </Badge>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                            <span className="font-semibold">Final Price:</span>
                            <span className="text-xl font-bold text-green-600">
                                ₹{data.finalTotal.toLocaleString("en-IN")}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Request Details Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            📝 Request Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <Label className="text-sm font-semibold">Reason:</Label>
                            <p className="mt-1 p-3 bg-muted rounded-md text-sm">{data.reason}</p>
                        </div>
                        {data.campaignItems.length > 0 && (
                            <div>
                                <Label className="text-sm font-semibold">Campaign Items:</Label>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {data.campaignItems.length} location(s) selected
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* OTP Section */}
                {step === "review" && (
                    <Card className="border-2 border-primary">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Security Verification Required
                            </CardTitle>
                            <CardDescription>
                                Generate an OTP to proceed with approval or rejection
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={handleGenerateOTP}
                                disabled={otpLoading}
                                className="w-full"
                                size="lg"
                            >
                                {otpLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating OTP...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Generate OTP
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {step === "otp" && (
                    <Card className="border-2 border-primary">
                        <CardHeader>
                            <CardTitle className="text-lg">Enter OTP</CardTitle>
                            <CardDescription>
                                A 6-digit OTP has been sent to your email. It expires in 10 minutes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="otp">OTP Code</Label>
                                <Input
                                    id="otp"
                                    type="text"
                                    maxLength={6}
                                    placeholder="000000"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                    className="text-center text-2xl tracking-widest font-mono"
                                />
                            </div>

                            <Separator />

                            <div>
                                <Label htmlFor="approvedPercent">Approved Discount % (Optional)</Label>
                                <Input
                                    id="approvedPercent"
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={approvedPercent}
                                    onChange={(e) => setApprovedPercent(parseInt(e.target.value) || 0)}
                                    className="text-sm"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    You can approve a different percentage than requested
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="rejectionReason">Rejection Reason (if rejecting)</Label>
                                <Textarea
                                    id="rejectionReason"
                                    placeholder="Provide a reason for rejection..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={3}
                                    className="text-sm"
                                />
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    onClick={handleApprove}
                                    disabled={otpLoading || !otp || otp.length !== 6}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    size="lg"
                                >
                                    {otpLoading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                    )}
                                    Approve
                                </Button>
                                <Button
                                    onClick={handleReject}
                                    disabled={otpLoading || !otp || otp.length !== 6 || !rejectionReason.trim()}
                                    variant="destructive"
                                    className="flex-1"
                                    size="lg"
                                >
                                    {otpLoading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <XCircle className="mr-2 h-4 w-4" />
                                    )}
                                    Reject
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
