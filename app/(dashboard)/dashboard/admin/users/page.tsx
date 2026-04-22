import { db } from "@/lib/db"
import UsersClient from "@/components/dashboard/UsersClient"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function UsersPage() {
    const session = await getServerSession(authOptions)
    const currentUserId = Number(session?.user?.id || 0)
    const currentUserRole = session?.user?.role || ""

    const users = await db.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
        }
    })

    return <UsersClient users={users} currentUserId={currentUserId} currentUserRole={currentUserRole} />
}
