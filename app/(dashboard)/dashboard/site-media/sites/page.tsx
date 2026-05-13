import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import SiteMediaBrowserClient from "@/components/dashboard/site-media/SiteMediaBrowserClient"

export default async function SiteMediaSitesPage() {
    const session = await getServerSession(authOptions)
    if (!session) redirect("/login")

    if (!["SITE_MEDIA", "ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
        redirect("/dashboard")
    }

    return <SiteMediaBrowserClient />
}
