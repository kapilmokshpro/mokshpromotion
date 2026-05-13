import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"

export default async function SiteMediaDashboardIndexPage() {
    const session = await getServerSession(authOptions)
    if (!session) redirect("/login")

    if (!["SITE_MEDIA", "ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
        redirect("/dashboard")
    }

    redirect("/dashboard/site-media/sites")
}
