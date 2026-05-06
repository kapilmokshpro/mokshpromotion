import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export const ADMIN_VENDOR_ROLES = ["ADMIN", "SUPER_ADMIN"] as const

export const isAdminVendorRole = (role?: string) =>
    !!role && ADMIN_VENDOR_ROLES.includes(role as (typeof ADMIN_VENDOR_ROLES)[number])

export const isVendorRole = (role?: string) => role === "VENDOR"

export async function requireAdminVendorSession() {
    const session = await getServerSession(authOptions)
    if (!session || !isAdminVendorRole(session.user.role)) {
        return { error: new NextResponse("Unauthorized", { status: 401 }) }
    }
    return { session }
}

export async function requireVendorSession() {
    const session = await getServerSession(authOptions)
    if (!session || !isVendorRole(session.user.role)) {
        return { error: new NextResponse("Unauthorized", { status: 401 }) }
    }
    return { session }
}

