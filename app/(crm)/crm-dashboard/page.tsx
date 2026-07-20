import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import CrmDashboardClient from "@/components/crm/CrmDashboardClient"

export default async function CrmDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/crm-dashboard/login?callbackUrl=/crm-dashboard")
  }

  const userId = Number(session.user.id)
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role || "")

  const [tasks, users] = await Promise.all([
    db.workTask.findMany({
      where: isAdmin ? undefined : { assignedToId: userId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true, employeeId: true, department: true } },
        assignedBy: { select: { id: true, name: true, email: true, role: true, employeeId: true, department: true } },
        updates: { include: { author: { select: { id: true, name: true, email: true, role: true, employeeId: true, department: true } } }, orderBy: { createdAt: "asc" } },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    }),
    db.user.findMany({
      where: { role: { notIn: ["VENDOR", "SITE_MEDIA"] } },
      select: { id: true, name: true, email: true, role: true, employeeId: true, department: true },
      orderBy: [{ employeeId: "asc" }, { name: "asc" }],
    }),
  ])

  return (
    <CrmDashboardClient
      currentUser={{
        id: userId,
        name: session.user.name || null,
        email: session.user.email || null,
        role: session.user.role || "SALES",
        employeeId: (session.user as any).employeeId || null,
        department: (session.user as any).department || null,
      }}
      isAdmin={isAdmin}
      tasks={tasks as any}
      users={users as any}
    />
  )
}
