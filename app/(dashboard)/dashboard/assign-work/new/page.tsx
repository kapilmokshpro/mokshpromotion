import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { NewTaskForm } from "@/components/dashboard/work/NewTaskForm"

export const metadata = {
  title: "New Task | Dashboard",
  description: "Assign a new task to users",
}

export default async function NewTaskPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/auth/signin")
  }

  const role = session.user.role
  const userId = parseInt(session.user.id)
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(role)

  if (!isAdmin) {
    redirect("/dashboard/assign-work")
  }

  const currentUser = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      department: true,
    }
  })

  const userFilter: any = {
    role: {
      notIn: ["VENDOR", "SITE_MEDIA", "UNASSIGNED", "SUPER_ADMIN", "CLIENT", "ADMIN"],
    },
  }

  if (currentUser?.role === "ADMIN" && currentUser.department) {
    userFilter.department = currentUser.department
  }

  const fetchedUsers = await db.user.findMany({
    where: userFilter,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      employeeId: true,
      department: true,
    },
  })

  // Custom sorting: MPL001 to MPL030 first, then ADMINs, then others
  const users = fetchedUsers.sort((a: any, b: any) => {
    const aIsMplUser = a.employeeId?.startsWith("MPL0")
    const bIsMplUser = b.employeeId?.startsWith("MPL0")
    
    if (aIsMplUser && !bIsMplUser) return -1
    if (!aIsMplUser && bIsMplUser) return 1
    if (aIsMplUser && bIsMplUser) return (a.employeeId || "").localeCompare(b.employeeId || "")
    
    const aIsAdmin = a.role === "ADMIN" || a.role === "SUPER_ADMIN"
    const bIsAdmin = b.role === "ADMIN" || b.role === "SUPER_ADMIN"

    if (aIsAdmin && !bIsAdmin) return -1
    if (!aIsAdmin && bIsAdmin) return 1

    const aName = a.employeeId || a.name || ""
    const bName = b.employeeId || b.name || ""
    return aName.localeCompare(bName)
  }).map((u: any) => ({
    ...u,
    id: u.id.toString()
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">New Task</h1>
      </div>
      <NewTaskForm users={users} />
    </div>
  )
}
