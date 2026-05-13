import { NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { db } from "@/lib/db"
import { requireSiteMediaSession } from "@/lib/site-media-auth"
import {
    buildSiteMediaObjectKey,
    buildSiteMediaPublicUrl,
    getSiteMediaS3Client,
    getSiteMediaStorageConfig,
    parseAndValidateSiteMediaUploadCandidates,
} from "@/lib/site-media-storage"

export const runtime = "nodejs"

type MediaPresignInput = {
    files?: Array<{
        fileName?: string
        mimeType?: string
        size?: number
    }>
}

const parseSiteId = (value: string) => {
    const id = Number(value)
    return Number.isInteger(id) && id > 0 ? id : null
}

export async function POST(
    req: Request,
    { params }: { params: { siteId: string } }
) {
    try {
        const guard = await requireSiteMediaSession()
        if (guard.error) return guard.error

        const siteId = parseSiteId(params.siteId)
        if (!siteId) {
            return new NextResponse("Invalid site id", { status: 400 })
        }

        const site = await db.inventoryHoarding.findUnique({
            where: { id: siteId },
            select: { id: true },
        })

        if (!site) {
            return new NextResponse("Site not found", { status: 404 })
        }

        const config = getSiteMediaStorageConfig()
        if (!config) {
            return new NextResponse("R2/S3 configuration missing for site media", { status: 500 })
        }

        const body = (await req.json()) as MediaPresignInput
        const files = Array.isArray(body.files) ? body.files : []
        const parsed = parseAndValidateSiteMediaUploadCandidates(
            files.map((file) => ({
                fileName: file.fileName || "",
                mimeType: file.mimeType || "",
                size: Number(file.size),
            }))
        )

        if (!parsed.length) {
            return new NextResponse("No files provided", { status: 400 })
        }

        const s3Client = getSiteMediaS3Client()

        const uploads = await Promise.all(
            parsed.map(async (item) => {
                const key = buildSiteMediaObjectKey({
                    inventoryHoardingId: siteId,
                    extension: item.extension,
                })

                const command = new PutObjectCommand({
                    Bucket: config.bucket,
                    Key: key,
                    ContentType: item.mimeType || undefined,
                })

                const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 })

                return {
                    type: item.type,
                    key,
                    fileName: item.fileName,
                    mimeType: item.mimeType,
                    size: item.size,
                    uploadUrl,
                    publicUrl: buildSiteMediaPublicUrl(key),
                }
            })
        )

        return NextResponse.json({ uploads })
    } catch (error) {
        if (error instanceof Error) {
            return new NextResponse(error.message, { status: 400 })
        }

        console.error("SITE_MEDIA_MEDIA_PRESIGN", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
