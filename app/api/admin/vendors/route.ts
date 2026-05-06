import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { db } from "@/lib/db"
import { requireAdminVendorSession } from "@/lib/vendor-auth"
import { createVendorSchema } from "@/lib/vendor-schemas"
import { createVendorInvite } from "@/lib/vendor-invite"
import { getAppBaseUrl } from "@/lib/runtime-config"
import { sendEmail } from "@/lib/email"
import { getVendorInviteEmailTemplate } from "@/lib/email-templates"
import { createAuditLog } from "@/lib/audit"

export async function GET() {
    try {
        const guard = await requireAdminVendorSession()
        if (guard.error) return guard.error

        const vendors = await db.user.findMany({
            where: { role: "VENDOR" },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                createdAt: true,
                vendorProfile: true,
                vendorAssignments: {
                    select: { id: true, status: true }
                }
            }
        })

        return NextResponse.json(vendors)
    } catch (error) {
        console.error("ADMIN_VENDORS_GET", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const guard = await requireAdminVendorSession()
        if (guard.error) return guard.error
        const session = guard.session

        const body = await req.json()
        const parsed = createVendorSchema.safeParse(body)
        if (!parsed.success) {
            return new NextResponse(parsed.error.issues[0]?.message || "Invalid request", { status: 400 })
        }

        const { name, email, phone, companyName, isActive } = parsed.data
        const normalizedEmail = email.trim().toLowerCase()

        const existing = await db.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true }
        })
        if (existing) {
            return new NextResponse("User with this email already exists", { status: 409 })
        }

        const temporaryPassword = crypto.randomBytes(24).toString("hex")
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10)

        const created = await db.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email: normalizedEmail,
                    password: hashedPassword,
                    phone: phone || null,
                    role: "VENDOR",
                }
            })

            const profile = await tx.vendorProfile.create({
                data: {
                    userId: user.id,
                    companyName: companyName || null,
                    phone: phone || null,
                    isActive: isActive ?? true,
                }
            })

            return { user, profile }
        })

        const invite = await createVendorInvite({
            userId: created.user.id,
            email: created.user.email
        })

        const baseUrl = getAppBaseUrl(req)
        const setupLink = `${baseUrl}/setup-vendor-password?vendorId=${created.user.id}&email=${encodeURIComponent(created.user.email)}&token=${invite.token}`
        const { subject, html } = getVendorInviteEmailTemplate({
            vendorName: created.user.name,
            companyName: created.profile.companyName,
            setupLink,
            expiresAt: invite.expiresAt,
        })
        const emailResult = await sendEmail({
            to: created.user.email,
            subject,
            html,
        })

        await createAuditLog(
            Number(session.user.id),
            "VENDOR_CREATED",
            "User",
            String(created.user.id),
            {
                vendorEmail: created.user.email,
                companyName: created.profile.companyName,
                inviteSent: emailResult.success,
                simulated: (emailResult as { simulated?: boolean }).simulated === true
            }
        )

        return NextResponse.json({
            success: true,
            vendor: {
                id: created.user.id,
                name: created.user.name,
                email: created.user.email,
                role: created.user.role,
                phone: created.user.phone,
                vendorProfile: created.profile,
            },
            invite: {
                sent: emailResult.success,
                simulated: (emailResult as { simulated?: boolean }).simulated === true
            }
        })
    } catch (error) {
        console.error("ADMIN_VENDORS_POST", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
