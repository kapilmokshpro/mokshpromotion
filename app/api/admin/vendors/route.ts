import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { db } from "@/lib/db"
import { requireAdminVendorSession } from "@/lib/vendor-auth"
import { createVendorSchema } from "@/lib/vendor-schemas"
import { createVendorInvite } from "@/lib/vendor-invite"
import { getAppBaseUrl } from "@/lib/runtime-config"
import { sendEmail } from "@/lib/email"
import { getVendorInviteEmailTemplate, getVendorWelcomeEmailTemplate } from "@/lib/email-templates"
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

        const { name, email, phone, companyName, city, isActive, password } = parsed.data
        const normalizedEmail = email.trim().toLowerCase()

        const existing = await db.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true }
        })
        if (existing) {
            return new NextResponse("User with this email already exists", { status: 409 })
        }

        const temporaryPassword = (password && password.trim().length >= 6)
            ? password.trim()
            : crypto.randomBytes(24).toString("hex")
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
                    city: city || null,
                    isActive: isActive ?? true,
                }
            })

            return { user, profile }
        })

        let emailResult;
        let inviteSent = false;
        const baseUrl = getAppBaseUrl(req);
        const isManualPassword = !!(password && password.trim().length >= 6);

        if (isManualPassword) {
            const loginLink = `${baseUrl}/login`;
            const { subject, html } = getVendorWelcomeEmailTemplate({
                vendorName: created.user.name,
                companyName: created.profile.companyName,
                loginLink,
            });
            emailResult = await sendEmail({
                to: created.user.email,
                subject,
                html,
            });
            inviteSent = emailResult.success;
        } else {
            const invite = await createVendorInvite({
                userId: created.user.id,
                email: created.user.email
            });
            const setupLink = `${baseUrl}/setup-vendor-password?vendorId=${created.user.id}&email=${encodeURIComponent(created.user.email)}&token=${invite.token}`;
            const { subject, html } = getVendorInviteEmailTemplate({
                vendorName: created.user.name,
                companyName: created.profile.companyName,
                setupLink,
                expiresAt: invite.expiresAt,
            });
            emailResult = await sendEmail({
                to: created.user.email,
                subject,
                html,
            });
            inviteSent = emailResult.success;
        }

        await createAuditLog(
            Number(session.user.id),
            "VENDOR_CREATED",
            "User",
            String(created.user.id),
            {
                vendorEmail: created.user.email,
                companyName: created.profile.companyName,
                inviteSent: inviteSent,
                simulated: (emailResult as { simulated?: boolean }).simulated === true,
                manualPasswordSet: isManualPassword
            }
        );

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
                sent: inviteSent,
                simulated: (emailResult as { simulated?: boolean }).simulated === true
            }
        });
    } catch (error) {
        console.error("ADMIN_VENDORS_POST", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
