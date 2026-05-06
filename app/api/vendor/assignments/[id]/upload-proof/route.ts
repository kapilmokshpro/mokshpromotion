import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireVendorSession } from "@/lib/vendor-auth"
import {
    MAX_VENDOR_PROOF_PHOTOS,
    MAX_VENDOR_PROOF_VIDEOS,
    parseAndValidateProofFiles,
    storeVendorProofFiles,
} from "@/lib/vendor-proof-storage"
import { createAuditLog } from "@/lib/audit"

export const runtime = "nodejs"

const canUploadForStatus = (status: string) =>
    [
        "ASSIGNED_TO_VENDOR",
        "PENDING_VENDOR_UPLOAD",
        "REUPLOAD_REQUESTED",
        "REJECTED",
    ].includes(status)

const parseCoordinate = (value: FormDataEntryValue | null) => {
    if (typeof value !== "string") return null
    const num = Number(value)
    return Number.isFinite(num) ? num : null
}

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const guard = await requireVendorSession()
        if (guard.error) return guard.error
        const session = guard.session
        const vendorId = Number(session.user.id)

        const assignment = await db.vendorSiteAssignment.findUnique({
            where: { id: params.id },
            select: {
                id: true,
                vendorId: true,
                status: true,
                inventoryHoardingId: true
            }
        })

        if (!assignment || assignment.vendorId !== vendorId) {
            return new NextResponse("Assignment not found", { status: 404 })
        }
        if (!canUploadForStatus(assignment.status)) {
            return new NextResponse("Upload is not allowed for this assignment status", { status: 400 })
        }

        const formData = await req.formData()
        const rawFiles = formData.getAll("files").filter((entry) => entry instanceof File) as File[]
        const latitude = parseCoordinate(formData.get("latitude"))
        const longitude = parseCoordinate(formData.get("longitude"))
        const accuracy = parseCoordinate(formData.get("accuracy"))

        if (latitude === null || longitude === null) {
            return new NextResponse("Latitude and longitude are required", { status: 400 })
        }

        const parsedFiles = parseAndValidateProofFiles(rawFiles)
        const storedFiles = await storeVendorProofFiles({
            vendorId,
            assignmentId: assignment.id,
            files: parsedFiles,
        })

        const now = new Date()
        const created = await db.$transaction(async (tx) => {
            const proof = await tx.vendorSiteProof.create({
                data: {
                    assignmentId: assignment.id,
                    vendorId,
                    inventoryHoardingId: assignment.inventoryHoardingId,
                    latitude,
                    longitude,
                    accuracy,
                    status: "SUBMITTED_FOR_APPROVAL",
                    submittedAt: now,
                    media: {
                        create: storedFiles.map((media) => ({
                            type: media.type,
                            url: media.url,
                            fileName: media.fileName,
                            mimeType: media.mimeType,
                            size: media.size,
                        }))
                    }
                },
                include: {
                    media: true
                }
            })

            await tx.vendorSiteAssignment.update({
                where: { id: assignment.id },
                data: { status: "SUBMITTED_FOR_APPROVAL" }
            })

            return proof
        })

        await createAuditLog(
            vendorId,
            "VENDOR_PROOF_SUBMITTED",
            "VendorSiteProof",
            created.id,
            {
                assignmentId: assignment.id,
                files: created.media.length,
                maxPhotoLimit: MAX_VENDOR_PROOF_PHOTOS,
                maxVideoLimit: MAX_VENDOR_PROOF_VIDEOS,
                latitude,
                longitude,
                accuracy,
            }
        )

        return NextResponse.json({
            success: true,
            proof: created,
        })
    } catch (error: any) {
        if (error instanceof Error) {
            return new NextResponse(error.message, { status: 400 })
        }
        console.error("VENDOR_UPLOAD_PROOF", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

