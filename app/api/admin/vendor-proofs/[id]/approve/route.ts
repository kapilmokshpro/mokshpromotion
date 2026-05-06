import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdminVendorSession } from "@/lib/vendor-auth"
import { vendorProofApproveSchema } from "@/lib/vendor-schemas"
import { resolveClientFromAssignment, getLocationLabel } from "@/lib/vendor-proof-utils"
import { getClientSiteLiveEmailTemplate } from "@/lib/email-templates"
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

        const body = await req.json().catch(() => ({}))
        const parsed = vendorProofApproveSchema.safeParse(body)
        if (!parsed.success) {
            return new NextResponse(parsed.error.issues[0]?.message || "Invalid request", { status: 400 })
        }

        const proofId = params.id
        const proof = await db.vendorSiteProof.findUnique({
            where: { id: proofId },
            include: {
                assignment: true,
                inventoryHoarding: true,
                media: { orderBy: { createdAt: "asc" } },
            }
        })
        if (!proof) return new NextResponse("Proof not found", { status: 404 })
        if (proof.status !== "SUBMITTED_FOR_APPROVAL") {
            return new NextResponse("Only submitted proofs can be approved", { status: 400 })
        }

        const updated = await db.$transaction(async (tx) => {
            const updatedProof = await tx.vendorSiteProof.update({
                where: { id: proof.id },
                data: {
                    status: "APPROVED",
                    approvedAt: new Date(),
                    approvedById: Number(session.user.id),
                    rejectedAt: null,
                    rejectionReason: null,
                }
            })

            await tx.vendorSiteAssignment.update({
                where: { id: proof.assignmentId },
                data: { status: "APPROVED" }
            })

            return updatedProof
        })

        let clientNotified = false
        let warning: string | null = null

        if (parsed.data.notifyClient) {
            const client = await resolveClientFromAssignment(proof.assignmentId)
            if (!client?.email) {
                warning = "Proof approved but no client email was found for notification."
            } else {
                const baseUrl = getAppBaseUrl(req)
                const firstMedia = proof.media[0]
                const proofLink = firstMedia?.url
                    ? `${baseUrl}${firstMedia.url}`
                    : null

                const { subject, html } = getClientSiteLiveEmailTemplate({
                    clientName: client.clientName,
                    siteName: proof.inventoryHoarding.outletName || proof.inventoryHoarding.locationName || "Site",
                    siteCode: proof.inventoryHoarding.inventoryCode,
                    locationLabel: getLocationLabel({
                        locationName: proof.inventoryHoarding.locationName,
                        city: proof.inventoryHoarding.city,
                        district: proof.inventoryHoarding.district,
                        state: proof.inventoryHoarding.state,
                    }),
                    campaignName: client.campaignName,
                    proofLink,
                })

                const emailResult = await sendEmail({
                    to: client.email,
                    subject,
                    html,
                })

                clientNotified = emailResult.success
                if (emailResult.success) {
                    await db.vendorSiteAssignment.update({
                        where: { id: proof.assignmentId },
                        data: { status: "CLIENT_NOTIFIED" }
                    })
                } else {
                    warning = "Proof approved but client notification email failed."
                }
            }
        }

        await createAuditLog(
            Number(session.user.id),
            "VENDOR_PROOF_APPROVED",
            "VendorSiteProof",
            proof.id,
            {
                assignmentId: proof.assignmentId,
                vendorId: proof.vendorId,
                clientNotified,
                warning,
            }
        )

        return NextResponse.json({
            success: true,
            proof: updated,
            clientNotified,
            warning,
        })
    } catch (error) {
        console.error("ADMIN_VENDOR_PROOF_APPROVE", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

