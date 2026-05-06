import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdminVendorSession } from "@/lib/vendor-auth"
import { createVendorAssignmentSchema } from "@/lib/vendor-schemas"
import { sendEmail } from "@/lib/email"
import { getVendorAssignmentEmailTemplate } from "@/lib/email-templates"
import { getAppBaseUrl } from "@/lib/runtime-config"
import { createAuditLog } from "@/lib/audit"

export async function GET(req: Request) {
    try {
        const guard = await requireAdminVendorSession()
        if (guard.error) return guard.error

        const { searchParams } = new URL(req.url)
        const status = searchParams.get("status")
        const vendorId = searchParams.get("vendorId")

        const assignments = await db.vendorSiteAssignment.findMany({
            where: {
                ...(status ? { status: status as any } : {}),
                ...(vendorId ? { vendorId: Number(vendorId) } : {})
            },
            orderBy: { createdAt: "desc" },
            include: {
                vendor: {
                    select: { id: true, name: true, email: true }
                },
                inventoryHoarding: {
                    select: {
                        id: true,
                        inventoryCode: true,
                        outletName: true,
                        locationName: true,
                        city: true,
                        district: true,
                        state: true
                    }
                },
                lead: {
                    select: {
                        id: true,
                        customerName: true,
                        email: true
                    }
                },
                proofs: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: {
                        id: true,
                        status: true,
                        submittedAt: true
                    }
                }
            }
        })

        return NextResponse.json(assignments)
    } catch (error) {
        console.error("ADMIN_VENDOR_ASSIGNMENTS_GET", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const guard = await requireAdminVendorSession()
        if (guard.error) return guard.error
        const session = guard.session

        const body = await req.json()
        const parsed = createVendorAssignmentSchema.safeParse(body)
        if (!parsed.success) {
            return new NextResponse(parsed.error.issues[0]?.message || "Invalid request", { status: 400 })
        }

        const {
            vendorId,
            inventoryHoardingIds,
            leadId,
            leadCampaignItemId,
            notes,
        } = parsed.data

        const vendor = await db.user.findUnique({
            where: { id: vendorId },
            include: { vendorProfile: true }
        })
        if (!vendor || vendor.role !== "VENDOR") {
            return new NextResponse("Vendor not found", { status: 404 })
        }
        if (vendor.vendorProfile && !vendor.vendorProfile.isActive) {
            return new NextResponse("Vendor is inactive", { status: 400 })
        }

        const sites = await db.inventoryHoarding.findMany({
            where: { id: { in: inventoryHoardingIds } },
            select: {
                id: true,
                inventoryCode: true,
                outletName: true,
                locationName: true,
                city: true,
                district: true,
                state: true
            }
        })

        if (sites.length !== inventoryHoardingIds.length) {
            return new NextResponse("Some selected sites were not found", { status: 400 })
        }

        const existingOpen = await db.vendorSiteAssignment.findMany({
            where: {
                vendorId,
                inventoryHoardingId: { in: inventoryHoardingIds },
                status: {
                    in: [
                        "ASSIGNED_TO_VENDOR",
                        "PENDING_VENDOR_UPLOAD",
                        "SUBMITTED_FOR_APPROVAL",
                        "REUPLOAD_REQUESTED",
                    ]
                }
            },
            select: { inventoryHoardingId: true }
        })

        const existingSiteIds = new Set(existingOpen.map((x) => x.inventoryHoardingId))
        const creatableSites = sites.filter((site) => !existingSiteIds.has(site.id))
        if (creatableSites.length === 0) {
            return new NextResponse("All selected sites already have open assignments for this vendor", { status: 409 })
        }

        const createdAssignments = await db.$transaction(async (tx) => {
            const created = []
            for (const site of creatableSites) {
                const assignment = await tx.vendorSiteAssignment.create({
                    data: {
                        vendorId,
                        inventoryHoardingId: site.id,
                        leadId: leadId || null,
                        leadCampaignItemId: leadCampaignItemId || null,
                        assignedById: Number(session.user.id),
                        status: "ASSIGNED_TO_VENDOR",
                        notes: notes || null,
                    }
                })
                created.push(assignment)
            }
            return created
        })

        const baseUrl = getAppBaseUrl(req)
        const dashboardLink = `${baseUrl}/dashboard/vendor/sites`

        for (const site of creatableSites) {
            const { subject, html } = getVendorAssignmentEmailTemplate({
                vendorName: vendor.name,
                siteName: site.outletName || site.locationName || "Assigned Site",
                siteCode: site.inventoryCode || null,
                locationLabel: [site.locationName, site.city || site.district, site.state].filter(Boolean).join(", "),
                notes: notes || null,
                dashboardLink,
            })
            await sendEmail({
                to: vendor.email,
                subject,
                html,
            })
        }

        await createAuditLog(
            Number(session.user.id),
            "VENDOR_SITE_ASSIGNED",
            "VendorSiteAssignment",
            createdAssignments.map((x) => x.id).join(","),
            {
                vendorId,
                totalAssigned: createdAssignments.length,
                inventoryHoardingIds: createdAssignments.map((x) => x.inventoryHoardingId),
            }
        )

        return NextResponse.json({
            success: true,
            createdCount: createdAssignments.length,
            skippedCount: existingSiteIds.size,
            assignments: createdAssignments
        })
    } catch (error) {
        console.error("ADMIN_VENDOR_ASSIGNMENTS_POST", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

