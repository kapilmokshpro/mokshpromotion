
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createHash } from "crypto"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendEmail } from "@/lib/email"
import { getDiscountInquiryClientTemplate } from "@/lib/email-templates"
import { buildSiteSelectionAttachment } from "@/lib/site-selection-attachment"

export async function POST(req: Request) {
    // Audit: Check Admin Auth
    const session = await getServerSession(authOptions)
    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { inquiryId, otp, discountPercent, action } = body

        if (!inquiryId || !action) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 })
        }

        const inquiry = await db.discountInquiry.findUnique({
            where: { id: inquiryId },
            include: { adminOtp: true }
        })

        if (!inquiry) return NextResponse.json({ error: "Inquiry not found" }, { status: 404 })
        if (inquiry.status !== "PENDING") {
            return NextResponse.json({ error: `Inquiry is already ${inquiry.status}` }, { status: 400 })
        }

        // Logic for Rejection
        if (action === "REJECT") {
            await db.discountInquiry.update({
                where: { id: inquiryId },
                data: { status: "REJECTED" }
            })
            // Optional: Send rejection email
            return NextResponse.json({ success: true, status: "REJECTED" })
        }

        // Logic for Approval
        if (!otp || !discountPercent) {
            return NextResponse.json({ error: "OTP and Discount % required for approval" }, { status: 400 })
        }

        // OTP Verification
        if (!inquiry.adminOtp) {
            return NextResponse.json({ error: "OTP record missing. Please request resend." }, { status: 400 })
        }

        const now = new Date()
        if (inquiry.adminOtp.expiresAt < now) {
            return NextResponse.json({ error: "OTP Expired" }, { status: 400 })
        }

        const otpHash = createHash("sha256").update(otp).digest("hex")
        if (otpHash !== inquiry.adminOtp.otpHash) {
            // Increment attempts
            await db.adminOtp.update({
                where: { id: inquiry.adminOtp.id },
                data: { attemptCount: { increment: 1 } }
            })
            return NextResponse.json({ error: "Invalid OTP" }, { status: 400 })
        }

        // Calculations
        const baseTotal = Number(inquiry.baseTotal)
        const pct = parseFloat(discountPercent)
        const discountAmount = (baseTotal * pct) / 100
        const finalTotal = baseTotal - discountAmount

        // Update DB
        await db.discountInquiry.update({
            where: { id: inquiryId },
            data: {
                status: "APPROVED",
                discountPercent: pct,
                discountAmount: discountAmount,
                finalTotal: finalTotal,
                approvedByUserId: Number(session.user.id),
                updatedAt: new Date()
            }
        })

        // Consume OTP
        await db.adminOtp.update({
            where: { id: inquiry.adminOtp.id },
            data: { consumedAt: new Date() }
        })

        // Send Email to Client
        let itemsHtml = ""
        let parsedItems: unknown[] = []
        try {
            const items = JSON.parse(inquiry.cartSnapshot)
            if (Array.isArray(items)) parsedItems = items
            itemsHtml = items.map((item: any) => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding:10px;">
                        <div style="font-weight:bold;">${item.name || item.outletName}</div>
                        <div style="font-size:12px; color:#666;">${item.location}, ${item.city}</div>
                    </td>
                    <td style="padding:10px; text-align:right;">
                        ₹${Number(item.netTotal).toLocaleString('en-IN')}
                    </td>
                </tr>
            `).join("")
        } catch (e) { }

        const { subject, html } = getDiscountInquiryClientTemplate({
            clientName: inquiry.clientName,
            baseTotal,
            discountPercent: pct,
            discountAmount,
            finalTotal,
            itemsHtmlTable: itemsHtml
        })

        const selectionAttachment = buildSiteSelectionAttachment(parsedItems, {
            filenamePrefix: `selected-sites-discount-${inquiry.id}`,
        })

        await sendEmail({
            to: inquiry.clientEmail,
            subject,
            html,
            attachments: selectionAttachment ? [selectionAttachment] : undefined,
        })

        return NextResponse.json({ success: true, status: "APPROVED" })

    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}
