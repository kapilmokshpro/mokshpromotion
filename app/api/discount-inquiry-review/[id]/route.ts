import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { verifySecureToken } from "@/lib/discount-utils"
import { getInfoEmail } from "@/lib/runtime-config"

/**
 * GET /api/discount-inquiry-review/[id]
 * Get discount inquiry details (token-based, no auth required)
 */
export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params
        const { searchParams } = new URL(req.url)
        const token = searchParams.get("token")

        if (!token) {
            return new NextResponse("Token is required", { status: 400 })
        }

        const inquiry = await db.discountInquiry.findUnique({
            where: { id },
        })

        if (!inquiry) {
            return new NextResponse("Inquiry not found", { status: 404 })
        }

        // Verify token against INFO inbox identity used during creation
        const adminEmail = getInfoEmail()

        if (
            !(inquiry as any).tokenHash ||
            !(inquiry as any).tokenExpiresAt ||
            new Date() > (inquiry as any).tokenExpiresAt
        ) {
            return new NextResponse("Token expired or invalid", { status: 401 })
        }

        const isValidToken = verifySecureToken(
            id,
            adminEmail,
            token,
            (inquiry as any).tokenHash
        )

        if (!isValidToken) {
            return new NextResponse("Invalid token", { status: 401 })
        }

        return NextResponse.json({
            success: true,
            inquiry
        })

    } catch (error) {
        console.error("GET_INQUIRY_REVIEW_ERROR", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
