import { NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { db } from "@/lib/db"
import { requireVendorSession } from "@/lib/vendor-auth"
import {
    buildVendorProofCloudPublicUrl,
    buildVendorProofObjectKey,
    buildVendorProofStoredFileName,
    getVendorMediaStorageMode,
    getVendorProofS3Client,
    parseAndValidateProofUploadCandidates,
    resolveS3StorageConfig,
} from "@/lib/vendor-proof-storage"

export const runtime = "nodejs"

const canUploadForStatus = (status: string) =>
    [
        "ASSIGNED_TO_VENDOR",
        "PENDING_VENDOR_UPLOAD",
        "REUPLOAD_REQUESTED",
        "REJECTED",
    ].includes(status)

type PresignInput = {
    assignmentId?: string
    files?: Array<{
        fileName?: string
        mimeType?: string
        size?: number
    }>
}

export async function POST(req: Request) {
    try {
        const guard = await requireVendorSession()
        if (guard.error) return guard.error
        const session = guard.session
        const vendorId = Number(session.user.id)

        const storageMode = getVendorMediaStorageMode()
        if (storageMode !== "s3") {
            return new NextResponse("Direct upload is unavailable in local storage mode", { status: 400 })
        }

        const s3Config = resolveS3StorageConfig()
        if (!s3Config) {
            return new NextResponse("S3 configuration missing for direct upload", { status: 500 })
        }

        const body = (await req.json()) as PresignInput
        const assignmentId = (body.assignmentId || "").trim()
        if (!assignmentId) {
            return new NextResponse("assignmentId is required", { status: 400 })
        }

        const filesInput = Array.isArray(body.files) ? body.files : []
        const parsedFiles = parseAndValidateProofUploadCandidates(
            filesInput.map((entry) => ({
                fileName: entry.fileName || "",
                mimeType: entry.mimeType || "",
                size: Number(entry.size),
            }))
        )

        const assignment = await db.vendorSiteAssignment.findUnique({
            where: { id: assignmentId },
            select: {
                id: true,
                vendorId: true,
                status: true,
            }
        })

        if (!assignment || assignment.vendorId !== vendorId) {
            return new NextResponse("Assignment not found", { status: 404 })
        }
        if (!canUploadForStatus(assignment.status)) {
            return new NextResponse("Upload is not allowed for this assignment status", { status: 400 })
        }

        const s3Client = getVendorProofS3Client(s3Config)

        const uploads = await Promise.all(
            parsedFiles.map(async (file) => {
                const finalName = buildVendorProofStoredFileName(file.fileName)
                const key = buildVendorProofObjectKey({
                    vendorId,
                    assignmentId: assignment.id,
                    finalName,
                })

                const command = new PutObjectCommand({
                    Bucket: s3Config.bucket,
                    Key: key,
                    ContentType: file.mimeType || undefined,
                })

                const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 })

                return {
                    mediaType: file.mediaType,
                    fileName: finalName,
                    mimeType: file.mimeType,
                    size: file.size,
                    key,
                    uploadUrl,
                    publicUrl: buildVendorProofCloudPublicUrl(s3Config, key),
                }
            })
        )

        return NextResponse.json({ uploads })
    } catch (error: any) {
        if (error instanceof Error) {
            return new NextResponse(error.message, { status: 400 })
        }
        console.error("VENDOR_PRESIGN_UPLOAD", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

