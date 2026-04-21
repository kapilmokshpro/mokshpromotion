
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createHash } from "crypto"
import { sendEmail } from "@/lib/email"
import { getDiscountInquiryAdminEmailTemplate } from "@/lib/email-templates"
import { generateSecureToken } from "@/lib/discount-utils"
import { getAppBaseUrl, getInfoEmail } from "@/lib/runtime-config"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { clientName, clientEmail, clientPhone, companyName, notes, expectedDiscount, items, baseTotal } = body

        // Validation
        if (!clientName || !clientEmail || !items || items.length === 0) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // 1. Create DiscountInquiry
        const inquiry = await db.discountInquiry.create({
            data: {
                clientName,
                clientEmail,
                clientPhone,
                companyName,
                notes,
                baseTotal,
                cartSnapshot: JSON.stringify(items),
                status: "PENDING"
            }
        })

        // 2. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const otpHash = createHash("sha256").update(otp).digest("hex")
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 mins

        // 3. Store AdminOtp
        await db.adminOtp.create({
            data: {
                inquiryId: inquiry.id,
                otpHash,
                expiresAt
            }
        })

        // 4. Use INFO inbox for inquiry notifications/tokens
        const adminEmail = getInfoEmail()

        // 5. Generate secure token for direct access
        const { token, hash: tokenHash, expiresAt: tokenExpiresAt } = generateSecureToken(
            inquiry.id,
            adminEmail
        )

        await db.discountInquiry.update({
            where: { id: inquiry.id },
            data: {
                tokenHash,
                tokenExpiresAt
            } as any
        })

        // 6. Send Email
        const baseUrl = getAppBaseUrl(req)
        const approveLink = `${baseUrl}/discount-inquiry-review/${inquiry.id}?token=${token}`

        const { subject, html } = getDiscountInquiryAdminEmailTemplate({
            clientName,
            clientEmail,
            clientPhone,
            companyName,
            baseTotal,
            requestedDiscount: expectedDiscount,
            notes,
            itemsCount: items.length,
            otp,
            otpExpiresAt: expiresAt,
            approveLink
        })

        await sendEmail({ to: adminEmail, subject, html })

        console.log(`[DEV] Info OTP for Inquiry ${inquiry.id}: ${otp}`) // Log for dev convenience

        return NextResponse.json({ success: true, inquiryId: inquiry.id })

    } catch (error) {
        console.error("DISCOUNT_INQUIRY_ERROR", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
