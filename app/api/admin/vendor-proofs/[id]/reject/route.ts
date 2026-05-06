import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdminVendorSession } from "@/lib/vendor-auth"
import { vendorProofRejectSchema } from "@/lib/vendor-schemas"
import { getVendorProofRejectedEmailTemplate } from "@/lib/email-templates"
import { sendEmail } from "@/lib/email"
import { getAppBaseUrl } from "@/lib/runtime-config"
import { createAuditLog } from "@/lib/audit"

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const guard = await requireAdminVendorSession()
        if (guard.error) return guard.error
        const session = guard.session

        const body = await req.json()
        const parsed = vendorProofRejectSchema.safeParse(body)
        if (!parsed.success) {
            return new NextResponse(parsed.error.issues[0]?.message || "Invalid request", { status: 400 })
        }

        const proof = await db.vendorSiteProof.findUnique({
            where: { id: params.id },
            include: {
                vendor: {
                    select: { id: true, name: true, email: true }
                },
                inventoryHoarding: {
                    select: { outletName: true, locationName: true }
                },
                assignment: true
            }
        })
        if (!proof) return new NextResponse("Proof not found", { status: 404 })
        if (proof.status !== "SUBMITTED_FOR_APPROVAL") {
            return new NextResponse("Only submitted proofs can be rejected", { status: 400 })
        }

        const updated = await db.$transaction(async (tx) => {
            const updatedProof = await tx.vendorSiteProof.update({
                where: { id: proof.id },
                data: {
                    status: "REJECTED",
                    rejectedAt: new Date(),
                    rejectionReason: parsed.data.reason,
                }
            })
            await tx.vendorSiteAssignment.update({
                where: { id: proof.assignmentId },
                data: { status: "REUPLOAD_REQUESTED" }
            })
            return updatedProof
        })

        const baseUrl = getAppBaseUrl(req)
        const { subject, html } = getVendorProofRejectedEmailTemplate({
            vendorName: proof.vendor.name,
            siteName: proof.inventoryHoarding.outletName || proof.inventoryHoarding.locationName || "Assigned Site",
            reason: parsed.data.reason,
            dashboardLink: `${baseUrl}/dashboard/vendor/sites/${proof.assignmentId}`,
        })
        await sendEmail({
            to: proof.vendor.email,
            subject,
            html,
        })

        await createAuditLog(
            Number(session.user.id),
            "VENDOR_PROOF_REJECTED",
            "VendorSiteProof",
            proof.id,
            {
                assignmentId: proof.assignmentId,
                vendorId: proof.vendor.id,
                reason: parsed.data.reason,
            }
        )

        return NextResponse.json({
            success: true,
            proof: updated
        })
    } catch (error) {
        console.error("ADMIN_VENDOR_PROOF_REJECT", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

