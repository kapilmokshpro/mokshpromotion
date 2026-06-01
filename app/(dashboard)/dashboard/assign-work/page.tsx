import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { WorkBoardClient } from "@/components/dashboard/work/WorkBoardClient"

export const metadata = {
  title: "Assign Work | Dashboard",
  description: "Manage and track tasks",
}

export default async function AssignWorkPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/auth/signin")
  }

  const role = session.user.role
  const userId = parseInt(session.user.id)
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(role)

  const dbCurrentUser = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      department: true,
      name: true,
      email: true,
    }
  })

  let users: any[] = []
  if (isAdmin) {
    const userFilter: any = {
      role: {
        notIn: ["VENDOR", "SITE_MEDIA", "UNASSIGNED", "ADMIN"],
      },
    }

    if (dbCurrentUser?.role === "ADMIN" && dbCurrentUser.department) {
      userFilter.department = dbCurrentUser.department
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
    users = fetchedUsers.sort((a: any, b: any) => {
      const aIsMplUser = a.employeeId?.startsWith("MPL0")
      const bIsMplUser = b.employeeId?.startsWith("MPL0")
      
      if (aIsMplUser && !bIsMplUser) return -1
      if (!aIsMplUser && bIsMplUser) return 1
      
      const aIsAdmin = a.role === "ADMIN" || a.role === "SUPER_ADMIN"
      const bIsAdmin = b.role === "ADMIN" || b.role === "SUPER_ADMIN"

      if (aIsAdmin && !bIsAdmin) return -1
      if (!aIsAdmin && bIsAdmin) return 1

      // Fallback to alphabetical sorting by employeeId or name
      const aName = a.employeeId || a.name || ""
      const bName = b.employeeId || b.name || ""
      return aName.localeCompare(bName)
    })
  }

  // Fetch tasks filtered by role/department
  let tasksQuery: any = {}
  if (dbCurrentUser?.role === "SUPER_ADMIN") {
    tasksQuery = {}
  } else if (dbCurrentUser?.role === "ADMIN") {
    if (dbCurrentUser.department) {
      tasksQuery = {
        assignedTo: {
          department: dbCurrentUser.department
        }
      }
    } else {
      tasksQuery = {}
    }
  } else {
    // Regular employee - only see tasks assigned to them
    tasksQuery = { assignedToId: userId }
  }

  const initialTasks = await db.workTask.findMany({
    where: tasksQuery,
    include: {
      assignedTo: {
        select: {
          name: true,
          email: true,
          employeeId: true,
          role: true,
          department: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  // Convert dates to string for client component and id to string
  const formattedTasks = initialTasks.map((task: any) => ({
    ...task,
    id: task.id.toString(),
    dueDate: task.dueDate ? task.dueDate.toISOString() : new Date().toISOString(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }))

  const formattedUsers = users.map((u: any) => ({
    ...u,
    id: u.id.toString()
  }))

  const currentUser = {
    id: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
  }

  return (
    <WorkBoardClient
      currentUser={currentUser}
      initialTasks={formattedTasks}
      users={formattedUsers}
    />
  )
}
