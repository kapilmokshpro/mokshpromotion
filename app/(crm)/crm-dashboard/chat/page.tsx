import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import ChatPageClient from "@/components/crm/ChatPageClient"

export default async function ChatPage() {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
        redirect("/crm-dashboard/login?callbackUrl=/crm-dashboard/chat")
    }

    return (
        <ChatPageClient
            currentUser={{
                id: Number(session.user.id),
                name: session.user.name || "Unknown",
                email: session.user.email || "",
                role: session.user.role || "SALES",
            }}
        />
    )
}
