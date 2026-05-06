import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireVendorSession } from "@/lib/vendor-auth"
import {
    MAX_VENDOR_PROOF_PHOTOS,
    MAX_VENDOR_PROOF_VIDEOS,
    buildVendorProofCloudPublicUrl,
    getVendorMediaStorageMode,
    parseAndValidateProofFiles,
    parseAndValidateProofUploadCandidates,
    resolveS3StorageConfig,
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

const parseCoordinate = (value: unknown) => {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null
    }
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

        const contentType = req.headers.get("content-type") || ""

        let latitude: number | null = null
        let longitude: number | null = null
        let accuracy: number | null = null
        let storedFiles: Array<{
            type: "PHOTO" | "VIDEO"
            url: string
            fileName: string
            mimeType: string
            size: number
        }> = []

        if (contentType.includes("application/json")) {
            const body = await req.json()
            latitude = parseCoordinate(body?.latitude)
            longitude = parseCoordinate(body?.longitude)
            accuracy = parseCoordinate(body?.accuracy)

            const uploadedMedia = Array.isArray(body?.uploadedMedia) ? body.uploadedMedia : []
            const parsedUploaded = parseAndValidateProofUploadCandidates(
                uploadedMedia.map((media: any) => ({
                    fileName: typeof media?.fileName === "string" ? media.fileName : "",
                    mimeType: typeof media?.mimeType === "string" ? media.mimeType : "",
                    size: Number(media?.size),
                }))
            )

            if (!parsedUploaded.length) {
                return new NextResponse("No uploaded media found", { status: 400 })
            }

            if (getVendorMediaStorageMode() !== "s3") {
                return new NextResponse("Direct upload proof submission is only available for S3 storage mode", { status: 400 })
            }

            const s3Config = resolveS3StorageConfig()
            if (!s3Config) {
                return new NextResponse("S3 configuration missing", { status: 500 })
            }

            storedFiles = parsedUploaded.map((media, index) => {
                const item = uploadedMedia[index]
                const key = typeof item?.key === "string" ? item.key.trim() : ""
                const expectedPrefix = `vendor-proofs/${vendorId}/${assignment.id}/`
                if (!key || !key.startsWith(expectedPrefix)) {
                    throw new Error(`Invalid uploaded object key for ${media.fileName}`)
                }

                return {
                    type: media.mediaType,
                    url: buildVendorProofCloudPublicUrl(s3Config, key),
                    fileName: media.fileName,
                    mimeType: media.mimeType,
                    size: media.size,
                }
            })
        } else {
            const formData = await req.formData()
            const rawFiles = formData.getAll("files").filter((entry) => entry instanceof File) as File[]
            latitude = parseCoordinate(formData.get("latitude"))
            longitude = parseCoordinate(formData.get("longitude"))
            accuracy = parseCoordinate(formData.get("accuracy"))

            const parsedFiles = parseAndValidateProofFiles(rawFiles)
            storedFiles = await storeVendorProofFiles({
                vendorId,
                assignmentId: assignment.id,
                files: parsedFiles,
            })
        }

        if (latitude === null || longitude === null) {
            return new NextResponse("Latitude and longitude are required", { status: 400 })
        }

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
