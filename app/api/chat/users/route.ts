import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/chat/users — List all active CRM users for direct messaging
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentUserId = Number(session.user.id)

    const users = await db.user.findMany({
        where: {
            id: { not: currentUserId },
            role: { notIn: ["VENDOR", "SITE_MEDIA"] },
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            employeeId: true,
            department: true,
        },
        orderBy: [{ name: "asc" }],
    })

    return NextResponse.json(users)
}
