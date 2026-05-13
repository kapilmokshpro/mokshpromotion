import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/login")
    }

    const role = session.user.role

    if (role === "SUPER_ADMIN") {
        redirect("/dashboard/super-admin")
    } else if (role === "ADMIN") {
        redirect("/dashboard/admin")
    } else if (role === "SALES") {
        redirect("/dashboard/sales")
    } else if (role === "FINANCE") {
        redirect("/dashboard/finance")
    } else if (role === "OPERATIONS") {
        redirect("/dashboard/operations")
    } else if (role === "VENDOR") {
        redirect("/dashboard/vendor")
    } else if (role === "SITE_MEDIA") {
        redirect("/dashboard/site-media")
    } else {
        redirect("/dashboard/sales")
    }
}
