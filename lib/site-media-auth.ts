import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"

export const ADMIN_SITE_MEDIA_ROLES = ["ADMIN", "SUPER_ADMIN"] as const
export const SITE_MEDIA_ALLOWED_ROLES = ["SITE_MEDIA", ...ADMIN_SITE_MEDIA_ROLES] as const

export const isAdminSiteMediaRole = (role?: string) =>
    !!role && ADMIN_SITE_MEDIA_ROLES.includes(role as (typeof ADMIN_SITE_MEDIA_ROLES)[number])

export const isSiteMediaAllowedRole = (role?: string) =>
    !!role && SITE_MEDIA_ALLOWED_ROLES.includes(role as (typeof SITE_MEDIA_ALLOWED_ROLES)[number])

export async function requireSiteMediaSession() {
    const session = await getServerSession(authOptions)
    if (!session || !isSiteMediaAllowedRole(session.user.role)) {
        return { error: new NextResponse("Unauthorized", { status: 401 }) }
    }

    return { session }
}
